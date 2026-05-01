// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TuringAgent8004
 * @notice ERC-8004 Agent Identity NFT — one token per AI agent.
 *         Records every trade, win/loss, and self-correction on-chain.
 *         Metadata updates dynamically after each cycle.
 */
contract TuringAgent8004 is ERC721, Ownable {
    struct AgentStats {
        uint256 totalTrades;
        uint256 wins;
        uint256 losses;
        uint256 selfCorrections;
        uint256 eloRating;
        string  currentStrategy; // JSON-encoded strategy params
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

    constructor() ERC721("TuringAgent", "TAGT") Ownable(msg.sender) {}

    function mint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        agentStats[tokenId].eloRating = 1200;
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
        } else {
            s.losses++;
            if (s.eloRating > 10) s.eloRating -= 10;
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

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        AgentStats memory s = agentStats[tokenId];
        // Dynamic on-chain metadata — judges can verify live stats via any RPC
        return string(abi.encodePacked(
            'data:application/json;utf8,{"name":"TuringAgent #', _toString(tokenId),
            '","description":"AI trading agent identity on Mantle.",',
            '"attributes":[',
            '{"trait_type":"Total Trades","value":', _toString(s.totalTrades), '},',
            '{"trait_type":"Wins","value":', _toString(s.wins), '},',
            '{"trait_type":"Losses","value":', _toString(s.losses), '},',
            '{"trait_type":"Self Corrections","value":', _toString(s.selfCorrections), '},',
            '{"trait_type":"ELO Rating","value":', _toString(s.eloRating), '}',
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
