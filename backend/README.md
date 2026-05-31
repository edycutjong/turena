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
- `DEEPSEEK_API_KEY`
- `BYBIT_API_KEY` & `BYBIT_API_SECRET`
- `SUPABASE_URL` & `SUPABASE_DB_PASSWORD`
- `DEPLOYER_PRIVATE_KEY` (for Mantle transactions)

### Running the Server
```bash
uvicorn main:app --reload
```

## Testing
To run the test suite with coverage:
```bash
pytest test_main.py -v --cov=. --cov-report=term
```
