import os
import json
import asyncio
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.db import get_pool, insert_cot_token
from app.services.deepseek import stream_reasoning
from app.services.mantle import record_trade, settle_cycle
from app.services.correction import run_self_correction

router = APIRouter()

EVAL_WINDOW_SECONDS = 30  # evaluate P&L this many seconds after execution



@router.get("/status")
async def get_status():
    """Return the currently active cycle with phase, emotion state, and agent stats."""
    pool = await get_pool()
    cycle = await pool.fetchrow(
        "SELECT id, cycle_number, phase, intent FROM trade_cycles WHERE result = 'pending' ORDER BY created_at DESC LIMIT 1"
    )
    agent = await pool.fetchrow(
        "SELECT emotion_state, consecutive_losses, win_rate, total_trades FROM agent_state WHERE agent_id = 'agent-0'"
    )
    return {
        "active_cycle_id":    str(cycle["id"]) if cycle else None,
        "cycle_number":       cycle["cycle_number"] if cycle else None,
        "phase":              cycle["phase"] if cycle else None,
        "emotion_state":      agent["emotion_state"] if agent else None,
        "consecutive_losses": agent["consecutive_losses"] if agent else 0,
        "win_rate":           round(float(agent["win_rate"]) * 100, 1) if agent else None,
        "total_trades":       agent["total_trades"] if agent else 0,
    }


@router.get("/params")
async def get_params():
    pool = await get_pool()
    row = await pool.fetchrow("SELECT current_params FROM agent_state WHERE agent_id = 'agent-0'")
    if row:
        return json.loads(row["current_params"])
    return {
        "slippage_tolerance": 0.005,
        "risk_weight": 0.1,
        "take_profit_pct": 0.02,
        "stop_loss_pct": 0.01,
        "confidence_threshold": 0.7,
    }


@router.post("/think")
async def think(market_context: str = "Current mETH/USDT price is rising. Analyze and decide."):
    """Start a new trade cycle: creates DB row, streams CoT tokens, announces intent."""
    pool = await get_pool()

    # Get next cycle number
    row = await pool.fetchrow("SELECT COALESCE(MAX(cycle_number), 0) + 1 AS next FROM trade_cycles")
    cycle_number = row["next"]
    cycle_id = str(uuid.uuid4())

    await pool.execute(
        """INSERT INTO trade_cycles (id, agent_id, cycle_number, result)
           VALUES ($1, 'agent-0', $2, 'pending')""",
        cycle_id, cycle_number,
    )

    intent_data: dict | None = None

    async def generate():
        nonlocal intent_data
        async for token_type, text in stream_reasoning(market_context):
            await insert_cot_token(pool, cycle_id, text, token_type)
            if token_type == "intent":
                intent_data = json.loads(text)
                # Update trade_cycles with the parsed intent
                await pool.execute(
                    "UPDATE trade_cycles SET intent = $1 WHERE id = $2",
                    text, cycle_id,
                )
            yield f"data: {json.dumps({'type': token_type, 'text': text, 'cycle_id': cycle_id})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'cycle_id': cycle_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/execute")
async def execute(cycle_id: str):
    """Execute the trade on Bybit and schedule result evaluation."""
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM trade_cycles WHERE id = $1", cycle_id)
    if not row:
        raise HTTPException(404, "Cycle not found")

    intent = json.loads(row["intent"] or "{}")
    action = intent.get("action", "long")

    # Bybit testnet execution (simplified — full CCXT order in Task 11)
    bybit_order_id = f"demo-{cycle_id[:8]}"

    await pool.execute(
        "UPDATE trade_cycles SET intent = $1 WHERE id = $2",
        json.dumps({**intent, "bybit_order_id": bybit_order_id}), cycle_id,
    )

    # Schedule evaluation after window
    asyncio.create_task(_evaluate_later(pool, cycle_id, action, EVAL_WINDOW_SECONDS))

    return {"cycle_id": cycle_id, "order_id": bybit_order_id, "status": "executing"}


async def _evaluate_later(pool, cycle_id: str, action: str, delay: int):
    await asyncio.sleep(delay)

    # Simulated P&L (±1–5 MNT) — replaced with real Bybit result in Task 11
    import random
    win = random.random() > 0.45
    pnl = round(random.uniform(1, 5) * (1 if win else -1), 2)

    tx_hash = await record_trade(token_id=0, win=win, pnl_wei=int(pnl * 1e18))

    await pool.execute(
        """UPDATE trade_cycles SET result = $1, pnl_mnt = $2, tx_hash = $3 WHERE id = $4""",
        "win" if win else "loss", pnl, tx_hash, cycle_id,
    )

    await pool.execute(
        """UPDATE agent_state SET
           total_trades = total_trades + 1,
           wins = CASE WHEN $1 THEN wins + 1 ELSE wins END,
           total_pnl = total_pnl + $2,
           win_rate = (wins::float / GREATEST(total_trades, 1)),
           updated_at = now()
           WHERE agent_id = 'agent-0'""",
        win, pnl,
    )

    if not win:
        params_row = await pool.fetchrow(
            "SELECT current_params FROM agent_state WHERE agent_id = 'agent-0'"
        )
        params = json.loads(params_row["current_params"] if params_row else "{}")
        await run_self_correction(pool, cycle_id, 0, pnl, params)
        await pool.execute(
            "UPDATE trade_cycles SET self_corrected = true WHERE id = $1", cycle_id
        )


class SabotageRequest(BaseModel):
    cycle_id: str
    card_type: str
    prompt_injection: str
    sender_address: str
    mnt_paid: float = 1.0


@router.post("/sabotage")
async def play_sabotage_card(body: SabotageRequest):
    """Record a FUD card play during the SABOTAGE_WINDOW phase."""
    pool = await get_pool()

    # Verify the cycle is in SABOTAGE_WINDOW phase
    row = await pool.fetchrow(
        "SELECT phase FROM trade_cycles WHERE id = $1", body.cycle_id
    )
    if not row:
        raise HTTPException(404, "Cycle not found")
    if row["phase"] != "SABOTAGE_WINDOW":
        raise HTTPException(400, f"Sabotage only allowed during SABOTAGE_WINDOW (current: {row['phase']})")

    await pool.execute(
        """INSERT INTO sabotage_events (cycle_id, card_type, prompt_injection, sender_address, mnt_paid)
           VALUES ($1, $2, $3, $4, $5)""",
        body.cycle_id, body.card_type, body.prompt_injection, body.sender_address, body.mnt_paid,
    )

    return {"status": "card played", "card_type": body.card_type, "cycle_id": body.cycle_id}


