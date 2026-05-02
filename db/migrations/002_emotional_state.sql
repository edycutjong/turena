-- Migration 002: Emotional AI state tracking
-- Run in Supabase SQL Editor

-- Add emotion token type to cot_tokens
-- (no CHECK constraint on token_type, so new values are backward-compatible)

-- Extend agent_state with emotional tracking columns
ALTER TABLE agent_state
  ADD COLUMN IF NOT EXISTS emotion_state       text    DEFAULT 'CONFIDENT',
  ADD COLUMN IF NOT EXISTS consecutive_losses  integer DEFAULT 0;

-- Extend cot_tokens comment for documentation
COMMENT ON COLUMN cot_tokens.token_type IS
  'reasoning | intent | correction | emotion';
