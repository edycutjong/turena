# Turena — Smart Contracts (Mantle)

Deployed on **Mantle Sepolia Testnet** (Chain ID: `5003`).

## `TuringAgent8004.sol` — ERC-8004 Agent Identity

The AI agent's permanent on-chain identity. Each trade and self-correction is recorded as an immutable event.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TuringAgent8004 is ERC721 {
    struct AgentStats {
        uint256 totalTrades;
        uint256 wins;
        uint256 losses;
        uint256 selfCorrections;
        uint256 eloRating;
        string currentStrategy; // JSON params
    }

    mapping(uint256 => AgentStats) public agentStats;

    event TradeRecorded(uint256 indexed tokenId, bool win, int256 pnl);
    event SelfCorrection(uint256 indexed tokenId, string param, uint256 oldVal, uint256 newVal, uint256 regretScore);

    function recordTrade(uint256 tokenId, bool win, int256 pnl) external;
    function recordSelfCorrection(uint256 tokenId, string memory param, uint256 oldVal, uint256 newVal, uint256 regretScore) external;
}
```

## `CounterTradeEscrow.sol` — Betting Escrow with Bankroll

Humans bet against the AI's bankroll. If the AI wins, human stakes are added to the pool. If the human wins, payout comes from the bankroll. `placeBet` reverts if the bankroll cannot cover the bet — ensuring provable solvency.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CounterTradeEscrow {
    uint256 public bankroll; // AI's liquidity pool — funded on deployment

    struct Cycle {
        uint256 totalPool;
        uint256 forAI;
        uint256 againstAI;
        bool settled;
        bool aiWon;
    }

    mapping(uint256 => Cycle) public cycles;
    mapping(uint256 => mapping(address => uint256)) public bets;

    event BetPlaced(uint256 indexed cycleId, address indexed bettor, uint256 amount, bool forAI);
    event CycleSettled(uint256 indexed cycleId, bool aiWon, uint256 totalPayout);
    event BankrollUpdated(uint256 newBalance);

    constructor() payable {
        bankroll = msg.value; // Initialize with AI bankroll (e.g. 1000 testnet MNT)
    }

    function placeBet(uint256 cycleId, bool forAI) external payable {
        require(msg.value > 0, "Bet must be > 0");
        require(bankroll >= msg.value, "Bankroll insufficient to cover bet");
        // ... record bet, update cycle pool
    }

    function settle(uint256 cycleId, bool aiWon) external; // onlyOwner
    function claim(uint256 cycleId) external;
    receive() external payable { bankroll += msg.value; } // Allow bankroll top-up
}
```

## Why Mantle + ERC-8004 is Non-Replaceable

> *"Could you swap Mantle out for a database?"* — **No.** Here's why:

1. **`recordTrade(tokenId, win, pnl)`** — Every trade result is an immutable on-chain event. A database record can be edited. A Mantle tx cannot. Radical Transparency is only credible if the record is tamper-proof.
2. **`recordSelfCorrection(tokenId, param, oldVal, newVal, regretScore)`** — The self-correction event emits a `SelfCorrection` log that anyone can verify on Mantle Explorer by pasting the tx hash. The parameter change is public before the next trade executes — not retrospectively claimed.
3. **Dynamic NFT metadata** — ERC-8004 allows token metadata to update after each cycle. The agent's ELO, win rate, and current strategy are readable on-chain. Remove Mantle and you'd need a separate oracle + database + trust assumption.
4. **Counter-trade settlement** — `CounterTradeEscrow.settle()` is called on-chain. Human payouts are provably fair — no server controls the outcome. Remove Mantle and you need a trusted server, which is antithetical to the demo's point.
5. **Bankroll solvency** — The contract's `bankroll` balance is publicly readable. Bettors can verify the AI's pool before placing a bet. No database equivalent of a public, auditable balance.

> Remove Mantle and you'd need: a trusted settlement server + a mutable audit DB + a separate payout system + a trust model. The entire "Radical Transparency" claim collapses.

## Sponsor SDK Integration

### ERC-8004 (Core Requirement)
- Mint one ERC-8004 NFT for the AI agent on deployment — token ID becomes the agent's permanent identity
- `recordTrade()` called after every cycle — emits `TradeRecorded` event on Mantle
- `recordSelfCorrection()` called on every parameter adjustment — emits `SelfCorrection` event
- Dynamic `tokenURI` returns live stats (win rate, ELO, corrections) — updates after each cycle
- All events verifiable on Mantle Explorer: judges can audit the full trading history independently

### Bybit API (Sponsor: Bybit)
- REST API for market data (price, orderbook) — real data, no mock
- **Testnet by default** (`https://api-testnet.bybit.com`) — production keys present but only active when `BYBIT_TESTNET=false`
- WebSocket for real-time price feeds → chart component

### Mantle Network
- Deploy contracts to Mantle Testnet (Chain ID: 5003)
- RPC: `https://rpc.sepolia.mantle.xyz`
- Faucet: `https://faucet.sepolia.mantle.xyz` for testnet MNT to fund the bankroll
