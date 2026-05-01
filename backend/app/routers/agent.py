import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class MockOutcomeRequest(BaseModel):
    cycle_id: str
    outcome: str = "loss"


@router.get("/params")
async def get_params():
    return {
        "slippage_tolerance": 0.005,
        "risk_weight": 0.1,
        "take_profit_pct": 0.02,
        "stop_loss_pct": 0.01,
        "confidence_threshold": 0.7,
    }


@router.post("/mock-outcome")
async def mock_outcome(body: MockOutcomeRequest):
    """Force an artificial trade outcome for demo recording only.
    Gated by DEMO_MODE=true — raises 403 in production."""
    if os.getenv("DEMO_MODE", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="mock-outcome is disabled outside DEMO_MODE")
    # Full implementation added in Task 9 (self-correction engine)
    return {"cycle_id": body.cycle_id, "forced_outcome": body.outcome, "status": "queued"}
