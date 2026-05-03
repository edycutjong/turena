"""Full autonomous trade cycle orchestrator."""
import asyncio
import json
import uuid
import asyncpg

from .db import get_pool, insert_cot_token
from .deepseek import stream_initial_analysis, stream_verdict
from .bybit import fetch_market_context, place_order, get_pnl
from .mantle import record_trade, record_emotional_state, settle_cycle
from .correction import run_self_correction

READING_WINDOW  = 0    # Phase 1 ends when AI says "Awaiting crowd sentiment"
SABOTAGE_WINDOW = 20   # seconds for Phase 2 — betting + FUD cards
EVAL_WINDOW     = 30   # seconds after execution to evaluate P&L
TOKEN_ID        = 0    # ERC-8004 agent token


async def _get_consecutive_losses(pool: asyncpg.Pool) -> int:
    """Count losses since the last win (determines emotional state)."""
    row = await pool.fetchrow(
        """WITH last_win AS (
               SELECT created_at FROM trade_cycles
               WHERE agent_id = 'agent-0' AND result = 'win'
               ORDER BY created_at DESC LIMIT 1
           )
           SELECT COUNT(*) AS streak FROM trade_cycles
           WHERE agent_id = 'agent-0' AND result = 'loss'
           AND created_at > COALESCE((SELECT created_at FROM last_win), '1970-01-01'::timestamptz)"""
    )
    return int(row["streak"]) if row else 0


async def _set_phase(pool: asyncpg.Pool, cycle_id: str, phase: str) -> None:
    if phase == "SABOTAGE_WINDOW":
        await pool.execute(
            "UPDATE trade_cycles SET phase = $1, sabotage_started_at = now() WHERE id = $2",
            phase, cycle_id,
        )
    else:
        await pool.execute("UPDATE trade_cycles SET phase = $1 WHERE id = $2", phase, cycle_id)


async def _fetch_sabotage_summary(pool: asyncpg.Pool, cycle_id: str) -> str:
    """Returns batched FUD card context for the verdict prompt.
    Falls back to empty string if sabotage_events table doesn't exist yet."""
    try:
        rows = await pool.fetch(
            """SELECT card_type, COUNT(*) AS n, SUM(mnt_paid) AS total_mnt
               FROM sabotage_events WHERE cycle_id = $1
               GROUP BY card_type ORDER BY total_mnt DESC""",
            cycle_id,
        )
        if not rows:
            return ""
        lines = [
            f"[CROWD: {r['n']} humans paid {r['total_mnt']:.1f} MNT to scream \"{r['card_type']}\" at you]"
            for r in rows
        ]
        return "\n".join(lines)
    except Exception:
        return ""


async def run_cycle(manual: bool = False) -> dict:
    """
    3-Phase trade cycle:
      Phase 1 — READING:          Market fetch + emotional state + AI initial analysis stream
      Phase 2 — SABOTAGE_WINDOW:  20s pause for human bets + FUD card plays
      Phase 3 — VERDICT:          AI streams final decision incorporating sabotage context
      Settlement:                 Execute order, evaluate P&L, record on Mantle, self-correct
    """
    pool = await get_pool()

    # ── Setup ──────────────────────────────────────────────────────────────
    market_ctx = await fetch_market_context()

    row = await pool.fetchrow("SELECT COALESCE(MAX(cycle_number), 0) + 1 AS next FROM trade_cycles")
    cycle_number = row["next"]
    cycle_id     = str(uuid.uuid4())

    await pool.execute(
        "INSERT INTO trade_cycles (id, agent_id, cycle_number, result, phase) VALUES ($1, 'agent-0', $2, 'pending', 'READING')",
        cycle_id, cycle_number,
    )

    consecutive_losses = await _get_consecutive_losses(pool)

    # ── Phase 1: READING ────────────────────────────────────────────────────
    initial_analysis = ""
    current_emotion: str = "CONFIDENT"

    async for token_type, text in stream_initial_analysis(market_ctx, consecutive_losses):
        if token_type == "emotion":
            current_emotion = text
            await insert_cot_token(pool, cycle_id, text, "emotion")
        elif token_type == "analysis_complete":
            initial_analysis = text
        else:
            db_type = token_type if token_type in ("reasoning", "intent", "correction") else "reasoning"
            await insert_cot_token(pool, cycle_id, text, db_type)

    # Record emotional state on-chain (non-blocking)
    try:
        await record_emotional_state(TOKEN_ID, current_emotion)
    except Exception as e:
        print(f"[emotional-state] on-chain record failed (non-fatal): {e}")

    # ── Phase 2: SABOTAGE_WINDOW ────────────────────────────────────────────
    await _set_phase(pool, cycle_id, "SABOTAGE_WINDOW")
    # Insert a pause token so the terminal shows the AI waiting
    await insert_cot_token(
        pool, cycle_id,
        "\n\n[Analyzing crowd sentiment... 20 seconds for the audience to make their move.]\n\n",
        "reasoning",
    )
    await asyncio.sleep(SABOTAGE_WINDOW)

    # ── Phase 3: VERDICT ────────────────────────────────────────────────────
    await _set_phase(pool, cycle_id, "VERDICT")
    sabotage_ctx = await _fetch_sabotage_summary(pool, cycle_id)

    if sabotage_ctx:
        await pool.execute(
            "UPDATE trade_cycles SET sabotage_summary = $1 WHERE id = $2",
            sabotage_ctx, cycle_id,
        )

    intent_data: dict = {}
    async for token_type, text in stream_verdict(initial_analysis, sabotage_ctx, consecutive_losses):
        db_type = token_type if token_type in ("reasoning", "intent", "correction") else "reasoning"
        await insert_cot_token(pool, cycle_id, text, db_type)
        if token_type == "intent":
            intent_data = json.loads(text)
            await pool.execute("UPDATE trade_cycles SET intent = $1 WHERE id = $2", text, cycle_id)

    if not intent_data:
        intent_data = {"action": "long", "asset": "MNTUSDT", "confidence": 0.5}

    action    = intent_data.get("action", "long")
    symbol    = "MNTUSDT"
    bybit_side = "buy" if action == "long" else "sell"

    # ── Settlement ──────────────────────────────────────────────────────────
    order = await place_order(symbol, bybit_side)
    entry_price = order.get("price") or order.get("average") or 0

    await pool.execute(
        "UPDATE trade_cycles SET intent = $1 WHERE id = $2",
        json.dumps({**intent_data, "bybit_order_id": order.get("id")}), cycle_id,
    )

    await asyncio.sleep(EVAL_WINDOW)

    pnl = await get_pnl(order.get("id", ""), symbol, bybit_side, entry_price)
    win = pnl > 0

    tx_hash = await record_trade(TOKEN_ID, win, int(pnl * 1e18))

    await pool.execute(
        "UPDATE trade_cycles SET result=$1, pnl_mnt=$2, tx_hash=$3, phase='SETTLED' WHERE id=$4",
        "win" if win else "loss", pnl, tx_hash, cycle_id,
    )

    await pool.execute(
        """INSERT INTO agent_state (agent_id, total_trades, total_pnl, win_rate, current_params, emotion_state, consecutive_losses)
           VALUES ('agent-0', 1, $1, $2, '{}', $3, $4)
           ON CONFLICT (agent_id) DO UPDATE SET
               total_trades       = agent_state.total_trades + 1,
               total_pnl          = agent_state.total_pnl + $1,
               win_rate           = ((agent_state.win_rate * agent_state.total_trades) + $2) / (agent_state.total_trades + 1),
               emotion_state      = $3,
               consecutive_losses = $4,
               updated_at         = now()""",
        pnl, 1.0 if win else 0.0, current_emotion, consecutive_losses + (0 if win else 1),
    )

    correction = None
    if not win:
        params_row = await pool.fetchrow("SELECT current_params FROM agent_state WHERE agent_id = 'agent-0'")
        params = json.loads(params_row["current_params"] if params_row else "{}")
        correction = await run_self_correction(pool, cycle_id, cycle_number, pnl, params)
        await pool.execute("UPDATE trade_cycles SET self_corrected = true WHERE id = $1", cycle_id)

    try:
        await settle_cycle(cycle_number, win)
    except Exception:
        pass

    return {
        "cycle_id":     cycle_id,
        "cycle_number": cycle_number,
        "win":          win,
        "pnl":          pnl,
        "tx_hash":      tx_hash,
        "correction":   correction,
    }
