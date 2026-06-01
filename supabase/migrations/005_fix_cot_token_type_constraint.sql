-- Migration 005: Allow 'emotion' as a valid cot_tokens.token_type
-- Run in Supabase SQL Editor
--
-- The existing cot_tokens_token_type_check constraint only allows
-- ('reasoning', 'intent', 'correction') but the emotional AI emits
-- token_type = 'emotion'. This migration drops the hard constraint so
-- any token type is accepted going forward.

ALTER TABLE cot_tokens DROP CONSTRAINT IF EXISTS cot_tokens_token_type_check;
