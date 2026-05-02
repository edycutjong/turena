-- Migration 003: Three-phase cycle support
-- Run in Supabase SQL Editor

-- Add phase tracking to trade_cycles
ALTER TABLE trade_cycles
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'PENDING';
-- Values: PENDING | READING | SABOTAGE_WINDOW | VERDICT | SETTLED

COMMENT ON COLUMN trade_cycles.phase IS
  'PENDING → READING → SABOTAGE_WINDOW → VERDICT → SETTLED';

-- Add sabotage context storage (filled in migration 004 with full sabotage_events table)
ALTER TABLE trade_cycles
  ADD COLUMN IF NOT EXISTS sabotage_summary TEXT;
