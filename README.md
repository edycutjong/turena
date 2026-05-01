<div align="center">
  <img src="docs/readme_hero.png" alt="Turena Logo" width="800">
  <h1>Turena 🚀</h1>
  <p><em>Watch AI Trade. Bet Against It.</em></p>
  
  [![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://turena.vercel.app)
  [![Pitch Video](https://img.shields.io/badge/Pitch-Video-red.svg)](https://youtube.com/)
  <br>
  <br>
  <!-- Tech Stack Badges -->
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
We built the frontend using **Next.js 16** and **Tailwind CSS**, communicating with smart contracts via **viem**. The backend is powered by **FastAPI** streaming to **Supabase Realtime**. We integrated the **DeepSeek R1 API** for the core reasoning agent.

```text
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

## 🏆 Sponsor Tracks Targeted
* **Mantle Network**: We deployed `TuringAgent8004` and `CounterTradeEscrow` smart contracts to Mantle Sepolia (Chain ID 5003), utilizing fast finality to settle prediction markets in real-time.

## 🤝 Sponsors & Partners
- **Co-Sponsored by:** Tencent Cloud, ELFA, Surf, Orbit AI, Minds, Mirana, OpenCheck, Nansen
- **Community & AI Partners:** BU, OT, Decipher, Imperial Blockchain & Fintech, Cornell Blockchain, MU Shanghai, Z.AI, Orakle, HKUST Crypto-Fintech Lab, Akindo, KudasaiJP, Rocketpunch, TradeGainTT, Four Pillars, Blockchain, Blockchain Valley, Zhejiang University (浙江大学), Merchant Moe, Cornell Blockchain
- **Co-Supported by:** DoraHacks, HackQuest

## 🚀 Run it Locally (For Judges)

### Prerequisites
- Node.js 20+, Python 3.12+
- MetaMask with Mantle Sepolia testnet (Chain ID 5003, RPC: `https://rpc.sepolia.mantle.xyz`)
- Testnet MNT from [https://faucet.sepolia.mantle.xyz](https://faucet.sepolia.mantle.xyz)

### 1. Frontend
```bash
# Clone the repo (or navigate to directory)
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_TURING_AGENT_ADDRESS, NEXT_PUBLIC_ESCROW_ADDRESS

# Run the app
npm run dev
```

> **Note for Judges:** 
> You can skip making an account! Connect your MetaMask to the Mantle Sepolia testnet.

### 2. Backend
```bash
cd backend
cp ../.env.example .env
# Fill in DEEPSEEK_API_KEY, BYBIT_API_KEY/SECRET, SUPABASE_URL/SERVICE_ROLE_KEY
# DEPLOYER_PRIVATE_KEY, TURING_AGENT_ADDRESS, ESCROW_ADDRESS
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
