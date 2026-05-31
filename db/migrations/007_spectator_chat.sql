-- Migration: 007_spectator_chat
-- Description: Create table for simulated spectator chat messages powered by OpenAI

CREATE TABLE IF NOT EXISTS spectator_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES trade_cycles(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sentiment VARCHAR(20) CHECK (sentiment IN ('BULLISH', 'BEARISH', 'NEUTRAL', 'TROLL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for real-time querying by cycle
CREATE INDEX IF NOT EXISTS idx_spectator_chat_cycle_id ON spectator_chat(cycle_id);

-- Enable RLS
ALTER TABLE spectator_chat ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can view spectator chat"
    ON spectator_chat
    FOR SELECT
    USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Service role can manage spectator chat"
    ON spectator_chat
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Supabase Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE spectator_chat;
