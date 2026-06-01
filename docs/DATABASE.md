# Turena — Database Schema (Supabase PostgreSQL)

Full schema definition: [`supabase/migrations/`](../supabase/migrations/)

## Tables

### `trade_cycles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `agent_id` | `text` | ERC-8004 token ID |
| `cycle_number` | `integer` | Sequential trade cycle number |
| `intent` | `jsonb` | `{action: "short", asset: "mETH", reason: "..."}` |
| `cot_transcript` | `text` | Full Chain-of-Thought reasoning text |
| `result` | `text` | `win` / `loss` / `pending` |
| `pnl_mnt` | `numeric` | Profit/Loss in MNT |
| `self_corrected` | `boolean` | Whether a correction was triggered |
| `tx_hash` | `text` | Mantle transaction hash |
| `sabotage_started_at` | `timestamptz` | When the 20s Sabotage Phase began |
| `created_at` | `timestamptz` | Timestamp |

### `counter_trades`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `cycle_id` | `uuid` | FK → `trade_cycles.id` |
| `wallet_address` | `text` | Human counter-trader address |
| `amount_mnt` | `numeric` | Amount wagered |
| `position` | `text` | `for` / `against` the AI |
| `result` | `text` | `win` / `loss` / `pending` |
| `payout_mnt` | `numeric` | Payout amount |
| `tx_hash` | `text` | Mantle escrow tx hash |
| `created_at` | `timestamptz` | Timestamp |

### `self_corrections`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `cycle_id` | `uuid` | FK → `trade_cycles.id` |
| `parameter_changed` | `text` | e.g. `slippage_tolerance`, `risk_weight` |
| `old_value` | `numeric` | Previous parameter value |
| `new_value` | `numeric` | Updated parameter value |
| `regret_score` | `numeric` | Calculated opportunity cost |
| `tx_hash` | `text` | Mantle SelfCorrection event tx |
| `created_at` | `timestamptz` | Timestamp |

### `sabotage_events`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `cycle_id` | `uuid` | FK → `trade_cycles.id` |
| `card_type` | `text` | e.g. `fake_news`, `fud` |
| `prompt_injection` | `text` | The injected FUD text |
| `sender_address` | `text` | Player wallet address |
| `mnt_paid` | `numeric` | Amount paid in MNT |
| `created_at` | `timestamptz` | Timestamp |

### `spectator_chat`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `cycle_id` | `uuid` | FK → `trade_cycles.id` |
| `username` | `text` | Simulated user name |
| `message` | `text` | Chat message |
| `sentiment` | `text` | `BULLISH`, `BEARISH`, `NEUTRAL`, `TROLL` |
| `created_at` | `timestamptz` | Timestamp |

### `agent_state`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `agent_id` | `text` | ERC-8004 token ID |
| `total_trades` | `integer` | Lifetime trade count |
| `win_rate` | `numeric` | Current win percentage |
| `total_pnl` | `numeric` | Cumulative P&L in MNT |
| `self_corrections_count` | `integer` | Total corrections made |
| `current_params` | `jsonb` | Active strategy parameters |
| `elo_rating` | `integer` | Performance rating |
| `emotion_state` | `text` | Current emotional state: `CONFIDENT` / `CAUTIOUS` / `ANXIOUS` / `TILTED` / `MELTDOWN` |
| `consecutive_losses` | `integer` | Loss streak since last win (drives emotion escalation) |
| `updated_at` | `timestamptz` | Last updated |

### `cot_tokens` (Realtime streaming bus)

This table doubles as the Supabase Realtime transport — every `INSERT` fires a `postgres_changes` event to all frontend subscribers.

```sql
CREATE TABLE cot_tokens (
  id         bigserial PRIMARY KEY,
  cycle_id   uuid REFERENCES trade_cycles(id),
  token_text text NOT NULL,
  token_type text DEFAULT 'reasoning', -- 'reasoning' | 'intent' | 'correction' | 'emotion'
  created_at timestamptz DEFAULT now()
);
-- Enable Realtime on this table in Supabase dashboard
```
