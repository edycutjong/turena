# TuringArena

**Watch AI Trade. Bet Against It.**

A live Twitch-style prediction market where a DeepSeek R1 trading agent streams its raw Chain-of-Thought reasoning in real-time. You have 15 seconds to counter-trade its decision. Every outcome is permanently recorded on Mantle via ERC-8004.

> DoraHacks Mantle Turing Test 2026 submission

---

## What it does

1. **AI Thinks Out Loud** — DeepSeek R1's `reasoning_content` tokens stream character-by-character to all viewers as it analyzes live Bybit market data.
2. **15-Second Counter Window** — The moment the AI announces its decision, a countdown opens. Place a bet against it using testnet MNT via MetaMask.
3. **On-Chain Provenance** — Every trade win/loss and every self-correction is recorded on Mantle via `TuringAgent8004` (ERC-8004 dynamic NFT) and `CounterTradeEscrow`. Verify on Mantle Sepolia Explorer.
4. **Self-Correction** — When the AI loses, it autonomously adjusts its risk parameters and broadcasts the change on-chain. The UI fires a full-screen overlay showing exactly what changed and why.

---

## Architecture

```
Browser (Next.js 16)
  ├── CoT Terminal       ← Supabase Realtime postgres_changes on cot_tokens
  ├── CountdownTimer     ← Framer Motion SVG ring
  ├── CounterTradeButton ← viem + MetaMask → CounterTradeEscrow.placeBet()
  ├── SelfCorrectionOverlay
  ├── LiveChat           ← Supabase Realtime broadcast (ephemeral)
  ├── /replay            ← historical CoT token playback
  └── /leaderboard       ← AI vs human win rate table

FastAPI Backend
  ├── DeepSeek R1 (deepseek-reasoner) → streams reasoning_content
  ├── Bybit Testnet (CCXT) → real orders
  ├── asyncpg → Supabase Postgres
  └── web3.py → Mantle Sepolia

Mantle Sepolia (Chain ID 5003)
  ├── TuringAgent8004.sol  — ERC-8004 dynamic NFT, recordTrade/recordSelfCorrection
  └── CounterTradeEscrow.sol — bankroll + placeBet/settle/claim
```

---

## Local setup

### Prerequisites
- Node.js 20+, Python 3.12+
- MetaMask with Mantle Sepolia testnet (Chain ID 5003, RPC: `https://rpc.sepolia.mantle.xyz`)
- Testnet MNT from [https://faucet.sepolia.mantle.xyz](https://faucet.sepolia.mantle.xyz)

### Frontend

```bash
cp .env.example .env.local
# Fill in Supabase + contract addresses
npm install
npm run dev
```

### Backend

```bash
cd backend
cp ../.env.example .env
# Fill in DEEPSEEK_API_KEY, BYBIT_API_KEY/SECRET, SUPABASE_URL/SERVICE_ROLE_KEY
# DEPLOYER_PRIVATE_KEY, TURING_AGENT_ADDRESS, ESCROW_ADDRESS
pip install -r requirements.txt
AUTO_CYCLE=true uvicorn main:app --reload
```

### Contracts

```bash
cd contracts
npm install
cp ../.env.example .env  # fill DEPLOYER_PRIVATE_KEY
npx hardhat run scripts/deploy.ts --network mantleTestnet
```

### Demo recording

```bash
# In one terminal: start backend with DEMO_MODE=true + AUTO_CYCLE=true
DEMO_MODE=true AUTO_CYCLE=true uvicorn main:app --reload

# In another terminal: trigger loss + self-correction at the right moment
./scripts/demo-trigger.sh
```

---

## Key env vars

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | Supabase anon key |
| `NEXT_PUBLIC_TURING_AGENT_ADDRESS` | frontend | Deployed TuringAgent8004 address |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | frontend | Deployed CounterTradeEscrow address |
| `DEEPSEEK_API_KEY` | backend | DeepSeek API key |
| `BYBIT_API_KEY` / `BYBIT_API_SECRET` | backend | Bybit testnet credentials |
| `DEPLOYER_PRIVATE_KEY` | backend + contracts | Mantle deployer wallet |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | backend | Supabase server-side |
| `AUTO_CYCLE=true` | backend | Start trade loop automatically |
| `DEMO_MODE=true` | backend | Enable `/agent/mock-outcome` endpoint |

---

## Stack

DeepSeek R1 · Next.js 16 · Supabase Realtime · Mantle Network · ERC-8004 · Bybit Testnet · viem · Framer Motion · Recharts · FastAPI · Hardhat 2
