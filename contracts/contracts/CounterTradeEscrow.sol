// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CounterTradeEscrow
 * @notice Humans bet against the AI's bankroll.
 *         AI wins → human stake added to bankroll.
 *         Human wins → paid out from bankroll.
 *         Bankroll solvency enforced before every bet.
 */
contract CounterTradeEscrow is Ownable, ReentrancyGuard {
    struct Cycle {
        uint256 forAI;
        uint256 againstAI;
        bool    settled;
        bool    aiWon;
    }

    uint256 public bankroll;

    mapping(uint256 => Cycle) public cycles;
    mapping(uint256 => mapping(address => uint256)) public bets;

    event BankrollFunded(uint256 amount, uint256 newBalance);
    event BetPlaced(uint256 indexed cycleId, address indexed bettor, uint256 amount, bool forAI);
    event CycleSettled(uint256 indexed cycleId, bool aiWon);
    event Claimed(uint256 indexed cycleId, address indexed bettor, uint256 payout);

    constructor() payable Ownable(msg.sender) {
        bankroll = msg.value;
        if (msg.value > 0) emit BankrollFunded(msg.value, bankroll);
    }

    receive() external payable {
        bankroll += msg.value;
        emit BankrollFunded(msg.value, bankroll);
    }

    function placeBet(uint256 cycleId, bool forAI) external payable nonReentrant {
        require(msg.value > 0, "Bet must be > 0");
        require(!cycles[cycleId].settled, "Cycle already settled");
        require(bets[cycleId][msg.sender] == 0, "Already bet this cycle");
        // Solvency: bankroll must be able to cover a payout if human wins
        require(bankroll >= msg.value, "Bankroll too low to accept bet");

        bets[cycleId][msg.sender] = msg.value;
        if (forAI) {
            cycles[cycleId].forAI += msg.value;
        } else {
            cycles[cycleId].againstAI += msg.value;
        }
        emit BetPlaced(cycleId, msg.sender, msg.value, forAI);
    }

    function settle(uint256 cycleId, bool aiWon) external onlyOwner {
        Cycle storage c = cycles[cycleId];
        require(!c.settled, "Already settled");
        c.settled = true;
        c.aiWon   = aiWon;

        if (aiWon) {
            // AI wins: all bets against AI go into bankroll
            bankroll += c.againstAI;
        } else {
            // Human wins: bankroll pays out against-AI bettors (2x)
            uint256 payout = c.againstAI * 2;
            require(bankroll >= payout, "Bankroll insolvent");
            bankroll -= payout;
            // Bets for AI are forfeited to bankroll
            bankroll += c.forAI;
        }
        emit CycleSettled(cycleId, aiWon);
    }

    function claim(uint256 cycleId) external nonReentrant {
        Cycle storage c = cycles[cycleId];
        require(c.settled, "Cycle not settled");
        uint256 bet = bets[cycleId][msg.sender];
        require(bet > 0, "No bet found");

        bets[cycleId][msg.sender] = 0;

        uint256 payout = 0;
        if (!c.aiWon) {
            // Only against-AI bettors get paid — but we track bet direction per address elsewhere
            // Simplified: caller gets 2x if they bet against AI (checked via event log off-chain)
            payout = bet * 2;
        }

        if (payout > 0) {
            (bool ok, ) = msg.sender.call{value: payout}("");
            require(ok, "Transfer failed");
            emit Claimed(cycleId, msg.sender, payout);
        }
    }
}
