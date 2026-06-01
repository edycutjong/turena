-- Migration 004: FUD Cards / Sabotage Events
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sabotage_events (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        uuid         REFERENCES trade_cycles(id) ON DELETE CASCADE,
  card_type       text         NOT NULL,
  prompt_injection text        NOT NULL,
  sender_address  text         NOT NULL,
  mnt_paid        numeric      NOT NULL DEFAULT 0,
  created_at      timestamptz  DEFAULT now()
);

-- Enable Realtime so the frontend TugOfWarBar updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE sabotage_events;

-- Allow anon reads (spectators can watch cards being played)
ALTER TABLE sabotage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON sabotage_events FOR SELECT TO anon USING (true);
CREATE POLICY "service_insert" ON sabotage_events FOR INSERT TO service_role WITH CHECK (true);
