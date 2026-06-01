// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ModelWarsEscrow
 * @notice Pari-mutuel betting on AI agents (DeepSeek vs OpenAI).
 *         If an AI wins, its bettors take a proportional share of the opposing pool.
 *         If there is a draw, everyone can claim their original bet back.
 */
contract CounterTradeEscrow is Ownable, ReentrancyGuard {
    // 0 = Pending, 1 = DeepSeek (Agent 0) won, 2 = OpenAI (Agent 1) won, 3 = Draw
    enum Winner { Pending, DeepSeek, OpenAI, Draw }

    struct Cycle {
        uint256 deepSeekPool;
        uint256 openAIPool;
        Winner  winner;
        bool    settled;
    }

    struct BetInfo {
        uint256 amount;
        uint8   agentChoice; // 1 for DeepSeek, 2 for OpenAI
    }

    mapping(uint256 => Cycle) public cycles;
    mapping(uint256 => mapping(address => BetInfo)) public bets;

    event BetPlaced(uint256 indexed cycleId, address indexed bettor, uint256 amount, uint8 agentChoice);
    event CycleSettled(uint256 indexed cycleId, Winner winner);
    event Claimed(uint256 indexed cycleId, address indexed bettor, uint256 payout);

    constructor() payable Ownable(msg.sender) {}

    // Allow contract to receive funds just in case
    receive() external payable {}

    /**
     * @notice Place a bet on an agent for a given cycle.
     * @param cycleId The ID of the trade cycle
     * @param agentChoice 1 for DeepSeek, 2 for OpenAI
     */
    function placeBet(uint256 cycleId, uint8 agentChoice) external payable {
        require(msg.value > 0, "Bet must be > 0");
        require(!cycles[cycleId].settled, "Cycle already settled");
        require(bets[cycleId][msg.sender].amount == 0, "Already bet this cycle");
        require(agentChoice == 1 || agentChoice == 2, "Invalid agent choice");

        bets[cycleId][msg.sender] = BetInfo({
            amount: msg.value,
            agentChoice: agentChoice
        });
        
        if (agentChoice == 1) {
            cycles[cycleId].deepSeekPool += msg.value;
        } else {
            cycles[cycleId].openAIPool += msg.value;
        }
        emit BetPlaced(cycleId, msg.sender, msg.value, agentChoice);
    }

    /**
     * @notice Settle the cycle, declaring the winner.
     * @param cycleId The ID of the trade cycle
     * @param winner 1 for DeepSeek, 2 for OpenAI, 3 for Draw
     */
    function settle(uint256 cycleId, uint8 winner) external onlyOwner {
        Cycle storage c = cycles[cycleId];
        require(!c.settled, "Already settled");
        require(winner >= 1 && winner <= 3, "Invalid winner status");
        
        c.settled = true;
        c.winner = Winner(winner);

        emit CycleSettled(cycleId, c.winner);
    }

    /**
     * @notice Claim payout if the bettor's chosen agent won, or refund if draw.
     */
    function claim(uint256 cycleId) external nonReentrant {
        Cycle storage c = cycles[cycleId];
        require(c.settled, "Cycle not settled");
        
        BetInfo storage betInfo = bets[cycleId][msg.sender];
        require(betInfo.amount > 0, "No bet found or already claimed");

        uint256 payout = 0;
        uint256 amount = betInfo.amount;
        uint8 choice = betInfo.agentChoice;

        // Prevent re-entrancy / double claiming
        betInfo.amount = 0;

        if (c.winner == Winner.Draw) {
            // Draw: Refund exactly the bet amount
            payout = amount;
        } else if (c.winner == Winner.DeepSeek && choice == 1) {
            // DeepSeek won
            if (c.openAIPool == 0) {
                payout = amount; // No losers to take from
            } else {
                // Proportional share of the opposing pool
                payout = amount + (amount * c.openAIPool) / c.deepSeekPool;
            }
        } else if (c.winner == Winner.OpenAI && choice == 2) {
            // OpenAI won
            if (c.deepSeekPool == 0) {
                payout = amount;
            } else {
                payout = amount + (amount * c.deepSeekPool) / c.openAIPool;
            }
        }

        if (payout > 0) {
            (bool ok, ) = msg.sender.call{value: payout}("");
            require(ok, "Transfer failed");
            emit Claimed(cycleId, msg.sender, payout);
        }
    }
}
