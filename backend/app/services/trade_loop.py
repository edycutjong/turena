"""Full autonomous trade cycle orchestrator."""
import asyncio
import json
import uuid
import asyncpg
import random

from .db import get_pool, insert_cot_token
from .deepseek import stream_initial_analysis as ds_initial, stream_verdict as ds_verdict
from .openai_agent import stream_initial_analysis as oa_initial, stream_verdict as oa_verdict
from .bybit import fetch_market_context, place_order, get_pnl
from .mantle import record_trade, record_emotional_state, settle_cycle, commit_prediction, reveal_prediction
from .correction import run_self_correction

READING_WINDOW  = 0
SABOTAGE_WINDOW = 20
EVAL_WINDOW     = 30
TOKEN_ID        = 0

async def _get_consecutive_losses(pool: asyncpg.Pool, agent_id: str) -> int:
    row = await pool.fetchrow(
        """WITH last_win AS (
               SELECT created_at FROM trade_cycles
               WHERE agent_id = $1 AND result = 'win'
               ORDER BY created_at DESC LIMIT 1
           )
           SELECT COUNT(*) AS streak FROM trade_cycles
           WHERE agent_id = $1 AND result = 'loss'
           AND created_at > COALESCE((SELECT created_at FROM last_win), '1970-01-01'::timestamptz)""",
        agent_id
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

async def stream_agent_phase1(pool, cycle_id, agent_id, stream_func, market_ctx, losses):
    initial_analysis = ""
    current_emotion = "CONFIDENT"
    async for token_type, text in stream_func(market_ctx, losses):
        if token_type == "emotion":
            current_emotion = text
            await insert_cot_token(pool, cycle_id, text, "emotion", agent_id)
        elif token_type == "analysis_complete":
            initial_analysis = text
        else:
            db_type = token_type if token_type in ("reasoning", "intent", "correction") else "reasoning"
            await insert_cot_token(pool, cycle_id, text, db_type, agent_id)
    return initial_analysis, current_emotion

async def stream_agent_phase3(pool, cycle_id, agent_id, stream_func, analysis, sabotage_ctx, losses):
    intent_data = {}
    async for token_type, text in stream_func(analysis, sabotage_ctx, losses):
        db_type = token_type if token_type in ("reasoning", "intent", "correction") else "reasoning"
        await insert_cot_token(pool, cycle_id, text, db_type, agent_id)
        if token_type == "intent":
            intent_data = json.loads(text)
    return intent_data

async def run_cycle(manual: bool = False) -> dict:
    pool = await get_pool()
    market_ctx = await fetch_market_context()

    row = await pool.fetchrow("SELECT COALESCE(MAX(cycle_number), 0) + 1 AS next FROM trade_cycles")
    cycle_number = row["next"]
    cycle_id     = str(uuid.uuid4())

    await pool.execute(
        "INSERT INTO trade_cycles (id, agent_id, cycle_number, result, phase) VALUES ($1, 'agent-0', $2, 'pending', 'READING')",
        cycle_id, cycle_number,
    )

    losses_ds = await _get_consecutive_losses(pool, 'agent-0')
    losses_oa = await _get_consecutive_losses(pool, 'agent-1')

    # Phase 1
    t1 = stream_agent_phase1(pool, cycle_id, 'agent-0', ds_initial, market_ctx, losses_ds)
    t2 = stream_agent_phase1(pool, cycle_id, 'agent-1', oa_initial, market_ctx, losses_oa)
    
    (analysis_ds, emotion_ds), (analysis_oa, emotion_oa) = await asyncio.gather(t1, t2)

    try:
        await record_emotional_state(TOKEN_ID, emotion_ds)
    except Exception as e:
        print(f"[emotional-state] on-chain record failed: {e}")

    # Phase 2
    await _set_phase(pool, cycle_id, "SABOTAGE_WINDOW")
    await insert_cot_token(pool, cycle_id, "\n\n[Analyzing crowd sentiment... 20 seconds for the audience to make their move.]\n\n", "reasoning", "agent-0")
    await insert_cot_token(pool, cycle_id, "\n\n[Analyzing crowd sentiment... 20 seconds for the audience to make their move.]\n\n", "reasoning", "agent-1")
    await asyncio.sleep(SABOTAGE_WINDOW)

    # Phase 3
    await _set_phase(pool, cycle_id, "VERDICT")
    sabotage_ctx = await _fetch_sabotage_summary(pool, cycle_id)
    if sabotage_ctx:
        await pool.execute("UPDATE trade_cycles SET sabotage_summary = $1 WHERE id = $2", sabotage_ctx, cycle_id)

    t3 = stream_agent_phase3(pool, cycle_id, 'agent-0', ds_verdict, analysis_ds, sabotage_ctx, losses_ds)
    t4 = stream_agent_phase3(pool, cycle_id, 'agent-1', oa_verdict, analysis_oa, sabotage_ctx, losses_oa)
    
    intent_ds, intent_oa = await asyncio.gather(t3, t4)

    if not intent_ds:
        intent_ds = {"action": "long", "asset": "MNTUSDT", "confidence": 0.5}
    if not intent_oa:
        intent_oa = {"action": "long", "asset": "MNTUSDT", "confidence": 0.5}

    await pool.execute("UPDATE trade_cycles SET intent = $1 WHERE id = $2", json.dumps(intent_ds), cycle_id)

    # Execution
    action_ds = intent_ds.get("action", "long")
    action_oa = intent_oa.get("action", "long")
    
    # We execute DS on Bybit. OA is paper-traded to avoid "opposing direction" exchange errors
    order = await place_order("MNTUSDT", "buy" if action_ds == "long" else "sell")
    entry_price = order.get("price") or order.get("average") or 0

    await pool.execute(
        "UPDATE trade_cycles SET intent = $1 WHERE id = $2",
        json.dumps({**intent_ds, "bybit_order_id": order.get("id")}), cycle_id,
    )

    # Mirror Engine
    mirror_action = action_ds.upper()
    mirror_confidence = int(intent_ds.get("confidence", 0.5) * 100)
    mirror_nonce = random.randint(1, 9999999)
    try:
        await commit_prediction(cycle_number, 0, mirror_action, mirror_confidence, mirror_nonce)
    except Exception as e:
        print(f"Commit prediction failed: {e}")

    await asyncio.sleep(EVAL_WINDOW)

    pnl_ds = await get_pnl(order.get("id", ""), "MNTUSDT", "buy" if action_ds == "long" else "sell", entry_price)
    win_ds = pnl_ds > 0
    
    # Calculate OA's PnL
    pnl_oa = pnl_ds if action_oa == action_ds else -pnl_ds
    win_oa = pnl_oa > 0

    # Determine Winner
    if pnl_ds > pnl_oa:
        winner = 1 # DeepSeek
        cycle_result = 'ds_win'
    elif pnl_oa > pnl_ds:
        winner = 2 # OpenAI
        cycle_result = 'oa_win'
    else:
        winner = 3 # Draw
        cycle_result = 'draw'

    tx_hash_ds = ""
    try:
        tx_hash_ds = await record_trade(0, win_ds, int(pnl_ds * 1e18))
        await record_trade(1, win_oa, int(pnl_oa * 1e18))
        await settle_cycle(cycle_number, winner)
        await reveal_prediction(cycle_number, 0, mirror_action, mirror_confidence, mirror_nonce, win_ds)
    except Exception as e:
        print(f"Mantle transaction failed: {e}")

    await pool.execute(
        "UPDATE trade_cycles SET result=$1, pnl_mnt=$2, tx_hash=$3, phase='SETTLED' WHERE id=$4",
        cycle_result, pnl_ds, tx_hash_ds, cycle_id,
    )

    for aid, pnl, win, emotion, losses in [('agent-0', pnl_ds, win_ds, emotion_ds, losses_ds), ('agent-1', pnl_oa, win_oa, emotion_oa, losses_oa)]:
        await pool.execute(
            """INSERT INTO agent_state (agent_id, total_trades, total_pnl, win_rate, current_params, emotion_state, consecutive_losses)
               VALUES ($1, 1, $2, $3, '{}', $4, $5)
               ON CONFLICT (agent_id) DO UPDATE SET
                   total_trades       = agent_state.total_trades + 1,
                   total_pnl          = agent_state.total_pnl + $2,
                   win_rate           = ((agent_state.win_rate * agent_state.total_trades) + $3) / (agent_state.total_trades + 1),
                   emotion_state      = $4,
                   consecutive_losses = $5,
                   updated_at         = now()""",
            aid, pnl, 1.0 if win else 0.0, emotion, losses + (0 if win else 1),
        )

    correction = None
    if not win_ds:
        params_row = await pool.fetchrow("SELECT current_params FROM agent_state WHERE agent_id = 'agent-0'")
        params = json.loads(params_row["current_params"] if params_row else "{}")
        correction = await run_self_correction(pool, cycle_id, cycle_number, pnl_ds, params)
        await pool.execute("UPDATE trade_cycles SET self_corrected = true WHERE id = $1", cycle_id)

    return {
        "cycle_id":     cycle_id,
        "cycle_number": cycle_number,
        "win":          win_ds,
        "pnl":          pnl_ds,
        "tx_hash":      tx_hash_ds,
        "correction":   correction,
    }
