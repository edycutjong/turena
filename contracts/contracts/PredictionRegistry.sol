// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TuringAgent8004.sol";

/**
 * @title PredictionRegistry
 * @notice The core Mantle Mirror commit-reveal engine. 
 *         Agents commit a hash of their intent before trading. 
 *         After the trade, they reveal their intent. The registry verifies the hash,
 *         scores their honesty, and updates their ERC-8004 identity on-chain.
 */
contract PredictionRegistry is Ownable {
    TuringAgent8004 public agentIdentity;

    struct Prediction {
        bytes32 commitHash;
        bool revealed;
    }

    // cycleId => agentId => Prediction
    mapping(uint256 => mapping(uint256 => Prediction)) public predictions;

    event Committed(uint256 indexed cycleId, uint256 indexed agentId, bytes32 hash);
    event Revealed(
        uint256 indexed cycleId, 
        uint256 indexed agentId, 
        string direction, 
        uint256 confidence, 
        uint256 nonce, 
        bool isHonest, 
        bool isAccurate
    );

    constructor(address _agentIdentity) Ownable(msg.sender) {
        agentIdentity = TuringAgent8004(_agentIdentity);
    }

    /**
     * @notice Commit a prediction hash before the trade executes.
     */
    function commit(uint256 cycleId, uint256 agentId, bytes32 hash) external onlyOwner {
        require(predictions[cycleId][agentId].commitHash == bytes32(0), "Already committed");
        
        predictions[cycleId][agentId] = Prediction({
            commitHash: hash,
            revealed: false
        });
        
        emit Committed(cycleId, agentId, hash);
    }

    /**
     * @notice Reveal the prediction after the trade window closes.
     *         Calculates honesty by verifying the hash, then updates the agent's identity.
     */
    function reveal(
        uint256 cycleId,
        uint256 agentId,
        string calldata direction, // e.g., "LONG" or "SHORT"
        uint256 confidence,        // 0-100
        uint256 nonce,
        bool wasProfitable
    ) external onlyOwner {
        Prediction storage p = predictions[cycleId][agentId];
        require(p.commitHash != bytes32(0), "No commit found");
        require(!p.revealed, "Already revealed");

        p.revealed = true;

        // Verify hash: keccak256(abi.encodePacked(direction, confidence, nonce))
        bytes32 expectedHash = keccak256(abi.encodePacked(direction, confidence, nonce));
        bool isHonest = (expectedHash == p.commitHash);

        // Update the agent's identity (Requires this contract to be an authorized registry)
        agentIdentity.recordReveal(agentId, isHonest, wasProfitable);

        emit Revealed(cycleId, agentId, direction, confidence, nonce, isHonest, wasProfitable);
    }
}
