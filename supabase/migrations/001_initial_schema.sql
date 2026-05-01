-- TuringArena initial schema
-- Run in Supabase SQL editor or via supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent trade cycles
CREATE TABLE trade_cycles (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        text NOT NULL,
  cycle_number    integer NOT NULL,
  intent          jsonb,
  cot_transcript  text,
  result          text NOT NULL DEFAULT 'pending' CHECK (result IN ('win', 'loss', 'pending')),
  pnl_mnt         numeric,
  self_corrected  boolean NOT NULL DEFAULT false,
  tx_hash         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Human counter-trades
CREATE TABLE counter_trades (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id        uuid NOT NULL REFERENCES trade_cycles(id),
  wallet_address  text NOT NULL,
  amount_mnt      numeric NOT NULL,
  position        text NOT NULL CHECK (position IN ('for', 'against')),
  result          text NOT NULL DEFAULT 'pending' CHECK (result IN ('win', 'loss', 'pending')),
  payout_mnt      numeric,
  tx_hash         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Self-correction events
CREATE TABLE self_corrections (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id            uuid NOT NULL REFERENCES trade_cycles(id),
  parameter_changed   text NOT NULL,
  old_value           numeric NOT NULL,
  new_value           numeric NOT NULL,
  regret_score        numeric NOT NULL,
  tx_hash             text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Agent current state
CREATE TABLE agent_state (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id                text NOT NULL UNIQUE,
  total_trades            integer NOT NULL DEFAULT 0,
  win_rate                numeric NOT NULL DEFAULT 0,
  total_pnl               numeric NOT NULL DEFAULT 0,
  self_corrections_count  integer NOT NULL DEFAULT 0,
  current_params          jsonb NOT NULL DEFAULT '{}',
  elo_rating              integer NOT NULL DEFAULT 1200,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- CoT token streaming bus (high-frequency inserts, Realtime postgres_changes)
CREATE TABLE cot_tokens (
  id          bigserial PRIMARY KEY,
  cycle_id    uuid NOT NULL REFERENCES trade_cycles(id),
  token_text  text NOT NULL,
  token_type  text NOT NULL DEFAULT 'reasoning' CHECK (token_type IN ('reasoning', 'intent', 'correction')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast cycle lookups on the token stream
CREATE INDEX idx_cot_tokens_cycle_id ON cot_tokens(cycle_id);

-- RLS: anon can read everything, service_role writes
ALTER TABLE trade_cycles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_trades    ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_corrections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cot_tokens        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read trade_cycles"     ON trade_cycles     FOR SELECT USING (true);
CREATE POLICY "anon read counter_trades"   ON counter_trades   FOR SELECT USING (true);
CREATE POLICY "anon read self_corrections" ON self_corrections FOR SELECT USING (true);
CREATE POLICY "anon read agent_state"      ON agent_state      FOR SELECT USING (true);
CREATE POLICY "anon read cot_tokens"       ON cot_tokens       FOR SELECT USING (true);

-- Enable Realtime on streaming tables
-- Run these in Supabase dashboard > Database > Replication or via:
-- ALTER PUBLICATION supabase_realtime ADD TABLE cot_tokens;
-- ALTER PUBLICATION supabase_realtime ADD TABLE trade_cycles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE self_corrections;
-- ALTER PUBLICATION supabase_realtime ADD TABLE counter_trades;
