-- Add agent_id to cot_tokens
ALTER TABLE cot_tokens ADD COLUMN agent_id text NOT NULL DEFAULT 'agent-0';

-- Add agent-1 to agent_state if not exists
INSERT INTO agent_state (agent_id, total_trades, win_rate, total_pnl, self_corrections_count, current_params, elo_rating, updated_at)
VALUES ('agent-1', 0, 0, 0, 0, '{}', 1200, now())
ON CONFLICT (agent_id) DO NOTHING;
