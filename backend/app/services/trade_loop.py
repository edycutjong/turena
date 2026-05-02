"""Full autonomous trade cycle orchestrator."""
import asyncio
import json
import uuid
import asyncpg

from .db import get_pool, insert_cot_token
from .deepseek import stream_reasoning
from .bybit import fetch_market_context, place_order, get_pnl
from .mantle import record_trade, settle_cycle
from .correction import run_self_correction

COUNTER_WINDOW = 15   # seconds humans have to counter-trade
EVAL_WINDOW    = 30   # seconds after execution to evaluate P&L
TOKEN_ID       = 0    # ERC-8004 agent token


async def run_cycle(manual: bool = False) -> dict:
    """
    Full trade cycle:
      1. Fetch market context from Bybit
      2. Stream DeepSeek R1 CoT → cot_tokens inserts
      3. Extract intent, update trade_cycles
      4. Wait COUNTER_WINDOW seconds (betting window)
      5. Execute Bybit order
      6. Wait EVAL_WINDOW seconds
      7. Evaluate P&L
      8. Record on Mantle (recordTrade)
      9. Self-correct if loss
     10. Settle escrow
    """
    pool = await get_pool()

    # --- Step 1: Market context ---
    market_ctx = await fetch_market_context()

    # --- Step 2: Create cycle row ---
    row = await pool.fetchrow(
        "SELECT COALESCE(MAX(cycle_number), 0) + 1 AS next FROM trade_cycles"
    )
    cycle_number = row["next"]
    cycle_id     = str(uuid.uuid4())

    await pool.execute(
        "INSERT INTO trade_cycles (id, agent_id, cycle_number, result) VALUES ($1, 'agent-0', $2, 'pending')",
        cycle_id, cycle_number,
    )

    # --- Step 3: Stream CoT ---
    intent_data: dict = {}
    async for token_type, text in stream_reasoning(market_ctx):
        # "content" is not a valid token_type in the DB — map it to "reasoning"
        db_token_type = token_type if token_type in ("reasoning", "intent", "correction") else "reasoning"
        await insert_cot_token(pool, cycle_id, text, db_token_type)
        if token_type == "intent":
            intent_data = json.loads(text)
            await pool.execute(
                "UPDATE trade_cycles SET intent = $1 WHERE id = $2", text, cycle_id,
            )

    if not intent_data:
        intent_data = {"action": "long", "asset": "MNTUSDT", "confidence": 0.5}

    action = intent_data.get("action", "long")
    symbol = "MNTUSDT"
    bybit_side = "buy" if action == "long" else "sell"

    # --- Step 4: Counter-trade window (non-blocking) ---
    await asyncio.sleep(COUNTER_WINDOW)

    # --- Step 5: Execute order ---
    order = await place_order(symbol, bybit_side)
    entry_price = order.get("price") or order.get("average") or 0

    await pool.execute(
        "UPDATE trade_cycles SET intent = $1 WHERE id = $2",
        json.dumps({**intent_data, "bybit_order_id": order.get("id")}), cycle_id,
    )

    # --- Step 6: Wait for evaluation ---
    await asyncio.sleep(EVAL_WINDOW)

    # --- Step 7: Evaluate P&L ---
    pnl = await get_pnl(order.get("id", ""), symbol, bybit_side, entry_price)
    win = pnl > 0

    # --- Step 8: Record on Mantle ---
    tx_hash = await record_trade(TOKEN_ID, win, int(pnl * 1e18))

    await pool.execute(
        "UPDATE trade_cycles SET result=$1, pnl_mnt=$2, tx_hash=$3 WHERE id=$4",
        "win" if win else "loss", pnl, tx_hash, cycle_id,
    )

    # Upsert agent_state — creates row on first cycle, updates on subsequent ones
    await pool.execute(
        """INSERT INTO agent_state (agent_id, total_trades, total_pnl, win_rate, current_params)
           VALUES ('agent-0', 1, $1, $2, '{}')
           ON CONFLICT (agent_id) DO UPDATE SET
               total_trades = agent_state.total_trades + 1,
               total_pnl    = agent_state.total_pnl + $1,
               win_rate     = ((agent_state.win_rate * agent_state.total_trades) + $2) / (agent_state.total_trades + 1),
               updated_at   = now()""",
        pnl, 1.0 if win else 0.0,
    )

    # --- Step 9: Self-correct on loss ---
    correction = None
    if not win:
        params_row = await pool.fetchrow(
            "SELECT current_params FROM agent_state WHERE agent_id = 'agent-0'"
        )
        params = json.loads(params_row["current_params"] if params_row else "{}")
        correction = await run_self_correction(pool, cycle_id, cycle_number, pnl, params)
        await pool.execute(
            "UPDATE trade_cycles SET self_corrected = true WHERE id = $1", cycle_id
        )

    # --- Step 10: Settle escrow ---
    try:
        await settle_cycle(cycle_number, win)
    except Exception:
        pass  # non-fatal if no bets were placed

    return {
        "cycle_id":    cycle_id,
        "cycle_number": cycle_number,
        "win":         win,
        "pnl":         pnl,
        "tx_hash":     tx_hash,
        "correction":  correction,
    }
