"""Tests for app/services/correction.py — 100% coverage."""
import json
import pytest
from unittest.mock import AsyncMock, patch

from app.services.correction import _choose_adjustment, run_self_correction


class TestChooseAdjustment:
    """Tests for _choose_adjustment()."""

    def test_large_loss_adjusts_risk_weight(self):
        params = {"risk_weight": 0.1, "stop_loss_pct": 0.01, "confidence_threshold": 0.7}
        param, old, new = _choose_adjustment(params, -6.0)
        assert param == "risk_weight"
        assert old == 0.1
        assert new == pytest.approx(0.1 * 0.85)

    def test_large_loss_clamps_to_min(self):
        params = {"risk_weight": 0.005}
        param, old, new = _choose_adjustment(params, -10.0)
        assert param == "risk_weight"
        assert new == 0.01  # max(0.01, 0.005 * 0.85)

    def test_medium_loss_adjusts_stop_loss(self):
        params = {"risk_weight": 0.1, "stop_loss_pct": 0.01, "confidence_threshold": 0.7}
        param, old, new = _choose_adjustment(params, -2.0)
        assert param == "stop_loss_pct"
        assert old == 0.01
        assert new == pytest.approx(0.01 * 0.9)

    def test_medium_loss_clamps_to_min(self):
        params = {"stop_loss_pct": 0.004}
        param, old, new = _choose_adjustment(params, -3.0)
        assert param == "stop_loss_pct"
        assert new == 0.005  # max(0.005, 0.004 * 0.9)

    def test_small_loss_adjusts_confidence(self):
        params = {"risk_weight": 0.1, "stop_loss_pct": 0.01, "confidence_threshold": 0.7}
        param, old, new = _choose_adjustment(params, -0.5)
        assert param == "confidence_threshold"
        assert old == 0.7
        assert new == pytest.approx(0.75)

    def test_small_loss_clamps_to_max(self):
        params = {"confidence_threshold": 0.93}
        param, old, new = _choose_adjustment(params, -0.3)
        assert param == "confidence_threshold"
        assert new == 0.95  # min(0.95, 0.93 + 0.05)

    def test_defaults_when_keys_missing(self):
        param, old, new = _choose_adjustment({}, -6.0)
        assert param == "risk_weight"
        assert old == 0.1

        param2, old2, new2 = _choose_adjustment({}, -2.0)
        assert param2 == "stop_loss_pct"
        assert old2 == 0.01

        param3, old3, new3 = _choose_adjustment({}, -0.5)
        assert param3 == "confidence_threshold"
        assert old3 == 0.7


class TestRunSelfCorrection:
    """Tests for run_self_correction()."""

    @pytest.mark.asyncio
    async def test_correction_with_large_loss(self, mock_pool):
        params = {"risk_weight": 0.1, "stop_loss_pct": 0.01, "confidence_threshold": 0.7}
        fake_tx = "0xdeadbeef1234567890"

        with patch("app.services.correction.record_self_correction", new_callable=AsyncMock, return_value=fake_tx):
            result = await run_self_correction(
                pool=mock_pool,
                cycle_id="cycle-1",
                cycle_number=1,
                pnl=-6.0,
                current_params=params,
                token_id=0,
            )

        assert result["param"] == "risk_weight"
        assert result["old_val"] == 0.1
        assert result["new_val"] == pytest.approx(0.1 * 0.85)
        assert result["tx_hash"] == fake_tx
        assert result["regret_score"] == 600  # ceil(6.0 * 100)
        assert "risk_weight" in result["new_params"]
        # 3 pool.execute calls: INSERT self_corrections, UPDATE agent_state, INSERT cot_tokens
        assert mock_pool.execute.await_count == 3

    @pytest.mark.asyncio
    async def test_correction_with_small_loss(self, mock_pool):
        params = {"confidence_threshold": 0.7}
        fake_tx = "0xabc"

        with patch("app.services.correction.record_self_correction", new_callable=AsyncMock, return_value=fake_tx):
            result = await run_self_correction(
                pool=mock_pool,
                cycle_id="c2",
                cycle_number=2,
                pnl=-0.3,
                current_params=params,
                token_id=1,
            )

        assert result["param"] == "confidence_threshold"
        assert result["regret_score"] == 30  # ceil(0.3 * 100)
