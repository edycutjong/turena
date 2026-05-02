// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TuringAgent8004
 * @notice ERC-8004 Agent Identity NFT — one token per AI agent.
 *         Records every trade, win/loss, self-correction, and emotional state on-chain.
 *         Metadata updates dynamically after each cycle — readable via any RPC.
 */
contract TuringAgent8004 is ERC721, Ownable {
    struct AgentStats {
        uint256 totalTrades;
        uint256 wins;
        uint256 losses;
        uint256 selfCorrections;
        uint256 eloRating;
        uint256 hubrisLevel;        // 0-100: rises with wins, falls on loss
        uint256 tiltLevel;          // 0-100: rises with consecutive losses, resets on win
        uint256 consecutiveLosses;
        string  currentStrategy;    // JSON-encoded strategy params
        string  emotionState;       // CONFIDENT | CAUTIOUS | ANXIOUS | TILTED | MELTDOWN
    }

    mapping(uint256 => AgentStats) public agentStats;
    uint256 private _nextTokenId;

    event TradeRecorded(uint256 indexed tokenId, bool win, int256 pnl);
    event SelfCorrection(
        uint256 indexed tokenId,
        string  param,
        uint256 oldVal,
        uint256 newVal,
        uint256 regretScore
    );
    event EmotionalStateUpdated(
        uint256 indexed tokenId,
        string  emotionState,
        uint256 hubrisLevel,
        uint256 tiltLevel
    );

    constructor() ERC721("TuringAgent", "TAGT") Ownable(msg.sender) {}

    function mint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        agentStats[tokenId].eloRating    = 1200;
        agentStats[tokenId].emotionState = "CONFIDENT";
        return tokenId;
    }

    function recordTrade(
        uint256 tokenId,
        bool    win,
        int256  pnl
    ) external onlyOwner {
        AgentStats storage s = agentStats[tokenId];
        s.totalTrades++;
        if (win) {
            s.wins++;
            s.eloRating += 10;
            s.consecutiveLosses = 0;
            // Hubris grows with wins (capped at 100)
            s.hubrisLevel = s.hubrisLevel + 10 > 100 ? 100 : s.hubrisLevel + 10;
            // Tilt resets on win
            s.tiltLevel = 0;
        } else {
            s.losses++;
            if (s.eloRating > 10) s.eloRating -= 10;
            s.consecutiveLosses++;
            // Hubris crashes on loss
            s.hubrisLevel = s.hubrisLevel > 20 ? s.hubrisLevel - 20 : 0;
            // Tilt escalates with consecutive losses (capped at 100)
            s.tiltLevel = s.consecutiveLosses * 25 > 100 ? 100 : s.consecutiveLosses * 25;
        }
        emit TradeRecorded(tokenId, win, pnl);
    }

    function recordSelfCorrection(
        uint256 tokenId,
        string  calldata param,
        uint256 oldVal,
        uint256 newVal,
        uint256 regretScore,
        string  calldata newStrategy
    ) external onlyOwner {
        agentStats[tokenId].selfCorrections++;
        agentStats[tokenId].currentStrategy = newStrategy;
        emit SelfCorrection(tokenId, param, oldVal, newVal, regretScore);
    }

    function recordEmotionalState(
        uint256 tokenId,
        string  calldata emotionState
    ) external onlyOwner {
        AgentStats storage s = agentStats[tokenId];
        s.emotionState = emotionState;
        emit EmotionalStateUpdated(tokenId, emotionState, s.hubrisLevel, s.tiltLevel);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        AgentStats memory s = agentStats[tokenId];
        // Dynamic on-chain metadata — readable by anyone via RPC or Mantlescan
        return string(abi.encodePacked(
            'data:application/json;utf8,{"name":"TuringAgent #', _toString(tokenId),
            '","description":"AI trading agent identity on Mantle. Emotional state is live.",',
            '"attributes":[',
            '{"trait_type":"Total Trades","value":', _toString(s.totalTrades), '},',
            '{"trait_type":"Wins","value":', _toString(s.wins), '},',
            '{"trait_type":"Losses","value":', _toString(s.losses), '},',
            '{"trait_type":"Self Corrections","value":', _toString(s.selfCorrections), '},',
            '{"trait_type":"ELO Rating","value":', _toString(s.eloRating), '},',
            '{"trait_type":"Hubris Level","value":', _toString(s.hubrisLevel), '},',
            '{"trait_type":"Tilt Level","value":', _toString(s.tiltLevel), '},',
            '{"trait_type":"Consecutive Losses","value":', _toString(s.consecutiveLosses), '},',
            '{"trait_type":"Emotion","value":"', s.emotionState, '"}',
            ']}'
        ));
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v;
        uint256 len;
        while (tmp != 0) { len++; tmp /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) { b[--len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}
