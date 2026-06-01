-- Migration: 009_spectator_chat_anon_insert
-- Description: Allow frontend (anon) to insert messages into spectator_chat so humans can participate

-- Create policy to allow anonymous inserts
CREATE POLICY "Public can insert spectator chat"
    ON spectator_chat
    FOR INSERT
    TO anon
    WITH CHECK (true);
