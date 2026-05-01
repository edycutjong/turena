import json
import math
import asyncpg
from .mantle import record_self_correction


# Which parameter to adjust based on loss characteristics
def _choose_adjustment(params: dict, pnl: float) -> tuple[str, float, float]:
    regret = abs(pnl)
    if regret > 5:
        # Large loss → tighten risk weight
        old = params.get("risk_weight", 0.1)
        new = max(0.01, old * 0.85)
        return "risk_weight", old, new
    elif regret > 1:
        # Medium loss → tighten stop loss
        old = params.get("stop_loss_pct", 0.01)
        new = max(0.005, old * 0.9)
        return "stop_loss_pct", old, new
    else:
        # Small loss → lower confidence threshold
        old = params.get("confidence_threshold", 0.7)
        new = min(0.95, old + 0.05)
        return "confidence_threshold", old, new


async def run_self_correction(
    pool: asyncpg.Pool,
    cycle_id: str,
    cycle_number: int,
    pnl: float,
    current_params: dict,
    token_id: int = 0,
) -> dict:
    param, old_val, new_val = _choose_adjustment(current_params, pnl)
    regret_score = math.ceil(abs(pnl) * 100)

    new_params = {**current_params, param: new_val}
    new_strategy = json.dumps(new_params)

    # Write to Mantle — emits SelfCorrection event (verifiable on Explorer)
    tx_hash = await record_self_correction(
        token_id=token_id,
        param=param,
        old_val=int(old_val * 1e6),
        new_val=int(new_val * 1e6),
        regret_score=regret_score,
        new_strategy=new_strategy,
    )

    # Persist to Supabase
    await pool.execute(
        """INSERT INTO self_corrections
           (cycle_id, parameter_changed, old_value, new_value, regret_score, tx_hash)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        cycle_id, param, old_val, new_val, float(regret_score), tx_hash,
    )

    await pool.execute(
        """UPDATE agent_state SET
           self_corrections_count = self_corrections_count + 1,
           current_params = $1,
           updated_at = now()
           WHERE agent_id = 'agent-0'""",
        json.dumps(new_params),
    )

    # Insert correction token into CoT stream so terminal displays it
    await pool.execute(
        """INSERT INTO cot_tokens (cycle_id, token_text, token_type)
           VALUES ($1, $2, 'correction')""",
        cycle_id,
        f"Self-correction: {param} {old_val:.4f} → {new_val:.4f} (regret={regret_score}). Tx: {tx_hash[:10]}…",
    )

    return {
        "param": param,
        "old_val": old_val,
        "new_val": new_val,
        "regret_score": regret_score,
        "tx_hash": tx_hash,
        "new_params": new_params,
    }
