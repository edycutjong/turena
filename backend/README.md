# Turena AI Backend

This is the Python FastAPI backend that powers the autonomous trading agents for Turena.

## Core Responsibilities
- **AI Engine**: Connects to the DeepSeek reasoning API (`o3-mini` or `R1` equivalent) to analyze live market data and stream Chain-of-Thought (CoT) reasoning.
- **Mantle Mirror Integration**: Generates the intent hashes and submits them to the Mantle `PredictionRegistry` smart contract before executing trades.
- **Realtime Sync**: Publishes CoT tokens directly to Supabase Realtime channels for the Next.js frontend to consume.
- **Trade Execution**: Connects to the Bybit API to execute the final trading decisions.

## Local Setup

### Requirements
- Python 3.12+

### Installation
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables
Copy `.env.example` to `.env` and fill in the keys:
- **Supabase Configuration**:
  - `SUPABASE_URL`: Supabase project URL (must match `NEXT_PUBLIC_SUPABASE_URL`).
  - `SUPABASE_SERVICE_ROLE_KEY`: Service role JWT key (never expose to frontend).
  - `SUPABASE_DB_PASSWORD`: Database password for connecting via asyncpg pooler.
  - `SUPABASE_POOLER_HOST`: Optional override for regional pooler host.
- **DeepSeek Integration**:
  - `DEEPSEEK_API_KEY`: DeepSeek API key (platform.deepseek.com).
- **Bybit Trading Integration**:
  - `BYBIT_API_KEY` & `BYBIT_API_SECRET`: API credentials (testnet or mainnet).
  - `BYBIT_TESTNET`: `true` to run on Bybit testnet.
- **Mantle Web3 Network**:
  - `MANTLE_RPC_URL`: RPC endpoint (defaults to Sepolia: `https://rpc.sepolia.mantle.xyz`).
  - `DEPLOYER_PRIVATE_KEY`: Throwaway wallet private key used for on-chain transactions.
- **Smart Contracts**:
  - `PREDICTION_REGISTRY_ADDRESS`: Registry contract address.
  - `TURING_AGENT_ADDRESS`: Main agent contract address.
  - `ESCROW_ADDRESS`: Escrow contract address.
- **Trading Loop Control**:
  - `AUTO_CYCLE`: `true` to run the automated cron trading loop.
  - `DEMO_MODE`: `true` to run in mock demo mode.
- **OpenAI Integration**:
  - `OPENAI_API_KEY`: Required for generating spectator chat content.

### Running the Server
```bash
uvicorn main:app --reload
```

## Testing
To run the test suite with coverage:
```bash
pytest test_main.py -v --cov=. --cov-report=term
```
