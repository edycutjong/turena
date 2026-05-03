-- Track exactly when SABOTAGE_WINDOW began so late-joining browsers
-- can calculate the correct remaining countdown time.
ALTER TABLE trade_cycles
  ADD COLUMN IF NOT EXISTS sabotage_started_at TIMESTAMPTZ;
