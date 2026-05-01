# Turena — API Reference

## Next.js API Routes (Frontend)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/agent/state` | Current agent stats + ERC-8004 metadata |
| `GET` | `/api/trades` | Recent trade history with CoT transcripts |
| `GET` | `/api/trades/[id]` | Single trade cycle detail |
| `GET` | `/api/corrections` | Self-correction event log |
| `GET` | `/api/leaderboard` | Human vs AI performance comparison |

## Python FastAPI (Backend)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/agent/think` | Trigger new trade cycle (starts CoT stream via DeepSeek R1) |
| `POST` | `/agent/execute` | Execute the trade after 15s window (Bybit Testnet) |
| `POST` | `/agent/correct` | Trigger self-correction analysis |
| `GET` | `/agent/params` | Current strategy parameters |
| `GET` | `/market/price` | Latest Bybit price data (with CoinGecko fallback) |
| `GET` | `/market/orderbook` | Order book snapshot |
| `WS` | `/ws/cot` | WebSocket for raw CoT token stream |
| `POST` | `/agent/mock-outcome` | **Demo only.** Force a `win`/`loss` result to guarantee a self-correction event. Gated by `DEMO_MODE=true` env var — disabled in production. |
