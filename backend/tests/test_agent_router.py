"""Tests for app/routers/agent.py — 100% coverage."""
import os
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient, ASGITransport


class TestAgentStatus:
    """Tests for GET /agent/status."""

    @pytest.mark.asyncio
    async def test_status_with_active_cycle(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={"id": "cycle-123", "cycle_number": 5})

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/agent/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["active_cycle_id"] == "cycle-123"
        assert data["cycle_number"] == 5

    @pytest.mark.asyncio
    async def test_status_no_active_cycle(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value=None)

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/agent/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["active_cycle_id"] is None


class TestAgentParams:
    """Tests for GET /agent/params."""

    @pytest.mark.asyncio
    async def test_params_with_existing_state(self):
        mock_pool = AsyncMock()
        params = {"risk_weight": 0.05, "stop_loss_pct": 0.008}
        mock_pool.fetchrow = AsyncMock(return_value={"current_params": json.dumps(params)})

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/agent/params")

        assert resp.status_code == 200
        assert resp.json()["risk_weight"] == 0.05

    @pytest.mark.asyncio
    async def test_params_returns_defaults(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value=None)

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/agent/params")

        assert resp.status_code == 200
        data = resp.json()
        assert data["risk_weight"] == 0.1
        assert data["confidence_threshold"] == 0.7


class TestAgentThink:
    """Tests for POST /agent/think."""

    @pytest.mark.asyncio
    async def test_think_streams_sse(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={"next": 1})
        mock_pool.execute = AsyncMock()

        async def mock_stream(_ctx):
            yield ("reasoning", "thinking...")
            yield ("intent", '{"action": "long", "confidence": 0.8}')

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.routers.agent.stream_reasoning", side_effect=mock_stream), \
             patch("app.routers.agent.insert_cot_token", new_callable=AsyncMock):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/think")

        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        # Check SSE format
        text = resp.text
        assert "data:" in text
        assert '"type": "done"' in text or '"type":"done"' in text


class TestAgentExecute:
    """Tests for POST /agent/execute."""

    @pytest.mark.asyncio
    async def test_execute_success(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={
            "id": "cycle-1",
            "intent": '{"action": "long"}',
            "cycle_number": 1,
            "result": "pending",
        })
        mock_pool.execute = AsyncMock()

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.routers.agent.asyncio.create_task", side_effect=lambda c: c.close()):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/execute?cycle_id=cycle-1")

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "executing"
        assert data["cycle_id"] == "cycle-1"

    @pytest.mark.asyncio
    async def test_execute_not_found(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value=None)

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/execute?cycle_id=nonexistent")

        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_execute_null_intent(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={
            "id": "cycle-2",
            "intent": None,
            "cycle_number": 2,
            "result": "pending",
        })
        mock_pool.execute = AsyncMock()

        with patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.routers.agent.asyncio.create_task", side_effect=lambda c: c.close()):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/execute?cycle_id=cycle-2")

        assert resp.status_code == 200


class TestEvaluateLater:
    """Tests for _evaluate_later()."""

    @pytest.mark.asyncio
    async def test_evaluate_win(self):
        from app.routers.agent import _evaluate_later
        mock_pool = AsyncMock()

        with patch("app.routers.agent.asyncio.sleep", new_callable=AsyncMock), \
             patch("app.routers.agent.record_trade", new_callable=AsyncMock, return_value="0xwin"):
            # Patch random at module level within the function's scope
            import random as random_mod
            with patch.object(random_mod, "random", return_value=0.9), \
                 patch.object(random_mod, "uniform", return_value=3.0):
                await _evaluate_later(mock_pool, "cycle-w", "long", 1)

        # Should NOT call run_self_correction for wins
        assert mock_pool.execute.await_count == 2  # UPDATE trade_cycles + UPDATE agent_state

    @pytest.mark.asyncio
    async def test_evaluate_loss_triggers_correction(self):
        from app.routers.agent import _evaluate_later
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={"current_params": '{"risk_weight": 0.1}'})

        with patch("app.routers.agent.asyncio.sleep", new_callable=AsyncMock), \
             patch("app.routers.agent.record_trade", new_callable=AsyncMock, return_value="0xloss"), \
             patch("app.routers.agent.run_self_correction", new_callable=AsyncMock):
            import random as random_mod
            with patch.object(random_mod, "random", return_value=0.1), \
                 patch.object(random_mod, "uniform", return_value=4.0):
                await _evaluate_later(mock_pool, "cycle-l", "short", 1)

        # 2 execute (trade_cycles update + agent_state) + fetchrow + correction + set self_corrected
        assert mock_pool.execute.await_count >= 3

    @pytest.mark.asyncio
    async def test_evaluate_loss_no_params_row(self):
        from app.routers.agent import _evaluate_later
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value=None)

        with patch("app.routers.agent.asyncio.sleep", new_callable=AsyncMock), \
             patch("app.routers.agent.record_trade", new_callable=AsyncMock, return_value="0xloss2"), \
             patch("app.routers.agent.run_self_correction", new_callable=AsyncMock):
            import random as random_mod
            with patch.object(random_mod, "random", return_value=0.2), \
                 patch.object(random_mod, "uniform", return_value=2.0):
                await _evaluate_later(mock_pool, "cycle-l2", "long", 1)


class TestMockOutcome:
    """Tests for POST /agent/mock-outcome."""

    @pytest.mark.asyncio
    async def test_mock_outcome_disabled(self):
        with patch.dict(os.environ, {"DEMO_MODE": "false"}):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/mock-outcome", json={
                    "cycle_id": "c1", "outcome": "win"
                })

        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_mock_outcome_win(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={
            "id": "c1", "cycle_number": 1, "result": "pending",
        })
        mock_pool.execute = AsyncMock()

        with patch.dict(os.environ, {"DEMO_MODE": "true"}), \
             patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.routers.agent.record_trade", new_callable=AsyncMock, return_value="0xwin"):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/mock-outcome", json={
                    "cycle_id": "c1", "outcome": "win"
                })

        assert resp.status_code == 200
        data = resp.json()
        assert data["outcome"] == "win"
        assert data["tx_hash"] == "0xwin"

    @pytest.mark.asyncio
    async def test_mock_outcome_loss_triggers_correction(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"id": "c2", "cycle_number": 2, "result": "pending"},  # cycle row
            {"current_params": '{"risk_weight": 0.1}'},  # params row
        ])
        mock_pool.execute = AsyncMock()
        correction_result = {"param": "risk_weight", "old_val": 0.1, "new_val": 0.085}

        with patch.dict(os.environ, {"DEMO_MODE": "true"}), \
             patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.routers.agent.record_trade", new_callable=AsyncMock, return_value="0xloss"), \
             patch("app.routers.agent.run_self_correction", new_callable=AsyncMock, return_value=correction_result):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/mock-outcome", json={
                    "cycle_id": "c2", "outcome": "loss"
                })

        assert resp.status_code == 200
        data = resp.json()
        assert data["outcome"] == "loss"
        assert "correction" in data

    @pytest.mark.asyncio
    async def test_mock_outcome_not_found(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value=None)

        with patch.dict(os.environ, {"DEMO_MODE": "true"}), \
             patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/mock-outcome", json={
                    "cycle_id": "nonexistent", "outcome": "win"
                })

        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_mock_outcome_loss_no_params(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"id": "c3", "cycle_number": 3, "result": "pending"},
            None,  # no params row
        ])
        mock_pool.execute = AsyncMock()
        correction_result = {"param": "risk_weight"}

        with patch.dict(os.environ, {"DEMO_MODE": "true"}), \
             patch("app.routers.agent.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.routers.agent.record_trade", new_callable=AsyncMock, return_value="0xloss3"), \
             patch("app.routers.agent.run_self_correction", new_callable=AsyncMock, return_value=correction_result):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/mock-outcome", json={
                    "cycle_id": "c3", "outcome": "loss"
                })

        assert resp.status_code == 200


class TestMockOutcomeModel:
    """Tests for MockOutcomeRequest model."""

    def test_model_defaults(self):
        from app.routers.agent import MockOutcomeRequest
        m = MockOutcomeRequest(cycle_id="c1")
        assert m.outcome == "loss"

    def test_model_custom(self):
        from app.routers.agent import MockOutcomeRequest
        m = MockOutcomeRequest(cycle_id="c2", outcome="win")
        assert m.outcome == "win"


class TestEvalWindowConstant:
    def test_value(self):
        from app.routers.agent import EVAL_WINDOW_SECONDS
        assert EVAL_WINDOW_SECONDS == 30
