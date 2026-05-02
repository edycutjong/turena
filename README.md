<div align="center">
  <img src="docs/readme_hero.png" alt="Turena Logo" width="800">
  <h1>TURENA 🚀</h1>
  <h3>⚔️ The Turing Arena</h3>
  <p><em>Watch AI Trade. Bet Against It.</em></p>
  
  [![DoraHacks](https://img.shields.io/badge/DoraHacks-BUIDL-FF761B.svg)](https://dorahacks.io/)
  [![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://turena.edycu.dev)
  [![Pitch Video](https://img.shields.io/badge/Pitch-Video-red.svg)](https://youtube.com/)
  <br>
  <!-- Tech Stack Badges -->
  <img src="https://img.shields.io/badge/Mantle-000000?style=flat-square&logo=mantle&logoColor=white" alt="Mantle" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
</div>

---

## 📸 See it in Action
A live Twitch-style prediction market where a DeepSeek R1 trading agent streams its raw Chain-of-Thought reasoning in real-time. You have 15 seconds to counter-trade its decision. Every outcome is permanently recorded on Mantle via ERC-8004.

![App Demo](docs/readme_hero.png)

## 💡 The Problem & Solution
In today's world, algorithmic AI agents trade autonomously in the dark, and humans are left to guess their strategies. 
**Turena** solves this by forcing the AI to "think out loud" on a live stream, letting humans front-run or counter-trade it before its final order hits the market. 

**Key Features:**
- ⚡ **AI Thinks Out Loud:** DeepSeek R1's `reasoning_content` tokens stream character-by-character as it analyzes live Bybit market data.
- ⏱️ **15-Second Counter Window:** The moment the AI announces its decision, a countdown opens. Place a bet against it using testnet MNT via MetaMask.
- 🔒 **On-Chain Provenance:** Every trade win/loss and self-correction is recorded on Mantle via `TuringAgent8004` (ERC-8004 dynamic NFT) and `CounterTradeEscrow`. Verify on Mantle Sepolia Explorer.
- 🧠 **Self-Correction:** When the AI loses, it autonomously adjusts its risk parameters and broadcasts the change on-chain. The UI fires a full-screen overlay showing exactly what changed and why.

## 🏗️ Architecture & Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 16 (App Router), React 19 | SSR for landing, client components for real-time UI |
| **Styling** | Tailwind CSS v4 | Fast iteration, dark mode, responsive |
| **Real-time** | Supabase Realtime | WebSocket channels for CoT streaming, bet updates — zero infra |
| **Database** | Supabase PostgreSQL | 5 tables — `trade_cycles`, `counter_trades`, `self_corrections`, `agent_state`, `cot_tokens`. [Full schema →](docs/DATABASE.md) |
| **AI Backend** | Python (FastAPI) | **DeepSeek R1** (`deepseek-reasoner`) — the only reasoning model that exposes raw `reasoning_content` tokens via SSE streaming |
| **Market Data** | Bybit API — **Testnet first** | Paper trading on testnet prevents real-money execution during demo |
| **Smart Contracts** | Solidity 0.8.20 (Hardhat) | ERC-8004 Agent Identity + Counter-Trade Escrow on Mantle |
| **Chain** | Mantle Testnet (5003) → Mainnet (5000) | Testnet contract address published and verifiable on Mantle Explorer |
| **Deploy** | Vercel (Frontend) + Railway (Python) | Fast, reliable, free tier |

> 📐 [Architecture](docs/ARCHITECTURE.md) · 🔌 [API Reference](docs/API.md) · 📜 [Smart Contracts](docs/CONTRACTS.md) · 🗄️ [Database Schema](docs/DATABASE.md)

### System Overview

**Vercel** serves the Next.js 16 frontend → subscribes to **Supabase Realtime** (`postgres_changes`) → renders CoT tokens, trades, and bets live. **Railway** runs the Python AI agent → streams reasoning to Supabase → executes trades on Bybit → records results on **Mantle** (ERC-8004 NFT + Escrow).

> 📐 Full system diagram, deployment topology, and event reference → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 📜 Smart Contracts (Mantle)

Two contracts deployed on Mantle Sepolia (Chain ID `5003`). Full interfaces and Solidity source in [docs/CONTRACTS.md](docs/CONTRACTS.md).

| Contract | Address | Explorer |
|---|---|---|
| `TuringAgent8004` | `0x3f24Bc75B258d35a347C4A76d49F45020A3457ce` | [View on Mantlescan ↗](https://sepolia.mantlescan.xyz/address/0x3f24Bc75B258d35a347C4A76d49F45020A3457ce) |
| `CounterTradeEscrow` | `0x766F2485219D5977AE727E6B1738891310EC8f3d` | [View on Mantlescan ↗](https://sepolia.mantlescan.xyz/address/0x766F2485219D5977AE727E6B1738891310EC8f3d) |

**`TuringAgent8004.sol`** — ERC-8004 dynamic NFT. Records every trade (`TradeRecorded` event) and self-correction (`SelfCorrection` event) immutably on-chain. The agent's ELO, win rate, and strategy are readable via `agentStats(tokenId)`.

**`CounterTradeEscrow.sol`** — Bankroll-backed betting escrow. Humans bet against the AI's pool. `placeBet` reverts if bankroll can't cover the bet. Settlement is on-chain — no server controls the outcome. Deployed with 1,000 testnet MNT bankroll.

## 🔐 Why Mantle + ERC-8004 is Non-Replaceable

> *"Could you swap Mantle out for a database?"* — **No.** Here's why:

1. **`recordTrade()`** — Every trade result is an immutable on-chain event. A database record can be edited; a Mantle tx cannot.
2. **`recordSelfCorrection()`** — The self-correction event emits a `SelfCorrection` log verifiable on Mantle Explorer by tx hash — public *before* the next trade.
3. **Dynamic NFT metadata** — ERC-8004 allows token metadata to update after each cycle. The agent's ELO, win rate, and strategy are readable on-chain.
4. **Counter-trade settlement** — `CounterTradeEscrow.settle()` is on-chain. Human payouts are provably fair.
5. **Bankroll solvency** — The contract's `bankroll` is publicly readable. Bettors verify the AI's pool before placing a bet.

> Remove Mantle and you'd need: a trusted settlement server + a mutable audit DB + a separate payout system + a trust model. The entire "Radical Transparency" claim collapses.

## 🏆 Sponsor Tracks Targeted
1. **Mantle Network**: We deployed `TuringAgent8004` and `CounterTradeEscrow` smart contracts to Mantle Sepolia (Chain ID 5003), utilizing fast finality to settle prediction markets in real-time.
2. **AI Trading & Strategy (BGA)**: Turena implements a transparent, on-chain macro-driven prediction market around an AI quant bot connected to Bybit testnet APIs.
3. **Consumer & Viral DApps**: The live streaming "Twitch-style" interface gamifies the trading experience, creating a highly shareable consumer application where humans battle against AI.

## 🤝 Sponsors & Partners
- **Co-Sponsored by:** Tencent Cloud, ELFA, Surf, Orbit AI, Minds, Mirana, OpenCheck, Nansen
- **Community & AI Partners:** BU, OT, Decipher, Imperial Blockchain & Fintech, Cornell Blockchain, MU Shanghai, Z.AI, Orakle, HKUST Crypto-Fintech Lab, Akindo, KudasaiJP, Rocketpunch, TradeGainTT, Four Pillars, Blockchain, Blockchain Valley, Zhejiang University (浙江大学), Merchant Moe, Cornell Blockchain
- **Co-Supported by:** DoraHacks, HackQuest

## 🚀 Run it Locally (For Judges)

### Prerequisites
- Node.js 20+, Python 3.12+
- MetaMask (or any EIP-1193 wallet)
- Testnet MNT from [https://faucet.sepolia.mantle.xyz](https://faucet.sepolia.mantle.xyz)

### MetaMask — Add Mantle Sepolia Testnet

> **Important:** Do **not** select "Testnet Mantle" from MetaMask's built-in list — that is the old deprecated network. Add the network manually with the values below.

In MetaMask → Settings → Networks → Add a network → Add a network manually:

| Field | Value |
|---|---|
| Network name | `Mantle Sepolia Testnet` |
| Default RPC URL | `https://rpc.sepolia.mantle.xyz` |
| Chain ID | `5003` |
| Currency symbol | `MNT` |
| Block explorer URL | `https://explorer.sepolia.mantle.xyz` |

### 1. Frontend
```bash
npm install
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#          NEXT_PUBLIC_TURING_AGENT_ADDRESS, NEXT_PUBLIC_ESCROW_ADDRESS
#          SUPABASE_SERVICE_ROLE_KEY
#          BACKEND_URL=http://localhost:8000
npm run dev
```

> **Note for Judges:** 
> You can skip making an account! Connect your MetaMask to the Mantle Sepolia testnet.

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in: DEEPSEEK_API_KEY, BYBIT_API_KEY, BYBIT_API_SECRET
#          SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#          DEPLOYER_PRIVATE_KEY, TURING_AGENT_ADDRESS, ESCROW_ADDRESS
pip install -r requirements.txt
AUTO_CYCLE=true uvicorn main:app --reload
```

### 3. Contracts
```bash
cd contracts
npm install
cp ../.env.example .env  # fill DEPLOYER_PRIVATE_KEY
npx hardhat run scripts/deploy.ts --network mantleTestnet
```

### 4. Demo Recording Mode
```bash
# In one terminal: start backend with DEMO_MODE=true + AUTO_CYCLE=true
DEMO_MODE=true AUTO_CYCLE=true uvicorn main:app --reload

# In another terminal: trigger loss + self-correction at the right moment
./scripts/demo-trigger.sh
```

---

## 🛠️ Key Environment Variables

**Vercel (Frontend)** — see `.env.example`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, safe for browser) |
| `NEXT_PUBLIC_TURING_AGENT_ADDRESS` | Deployed TuringAgent8004 contract address |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | Deployed CounterTradeEscrow contract address |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — server-side API routes only, never exposed to browser |
| `BACKEND_URL` | Railway backend URL — server-side only. Local: `http://localhost:8000` |
| `DEMO_MODE` | `true` enables `/api/agent/trade-loop` and `/api/agent/mock-outcome` endpoints. Never `true` in production |

**Railway (Backend)** — see `backend/.env.example`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (same value as `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | Direct asyncpg connection string. Format: `postgresql://postgres.<project-id>:<SUPABASE_SERVICE_ROLE_KEY>@aws-0-us-east-1.pooler.supabase.com:6543/postgres`. If blank, auto-built from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `BYBIT_API_KEY` | Bybit testnet API key |
| `BYBIT_API_SECRET` | Bybit testnet API secret |
| `BYBIT_TESTNET` | Set to `true` for testnet |
| `DEPLOYER_PRIVATE_KEY` | Mantle deployer wallet private key |
| `TURING_AGENT_ADDRESS` | Deployed TuringAgent8004 contract address |
| `ESCROW_ADDRESS` | Deployed CounterTradeEscrow contract address |
| `MANTLE_RPC_URL` | Mantle RPC URL (defaults to `https://rpc.sepolia.mantle.xyz`) |
| `AUTO_CYCLE` | `true` starts the trade loop automatically on server boot |
| `DEMO_MODE` | `true` enables `/agent/mock-outcome` endpoint. Never `true` in production |

**FE ↔ BE Communication**

| Next.js Route | Talks To | How |
|---|---|---|
| `/api/market/price` | Python backend | Server-side proxy via `BACKEND_URL` |
| `/api/agent/trade-loop` | Supabase directly | No backend involved (demo only) |
| `/api/agent/mock-outcome` | Supabase directly | No backend involved (demo only) |
| All real-time UI | Supabase Realtime | WebSocket — no backend involved |
