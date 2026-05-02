"""Tests for main.py — 100% coverage."""
import os
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient, ASGITransport


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health(self):
        from main import app
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "Turena Backend"


class TestRunCycleManual:
    @pytest.mark.asyncio
    async def test_run_cycle_manual(self):
        with patch("main.asyncio.create_task", side_effect=lambda c: c.close()) as mock_task:
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/agent/run-cycle")
        assert resp.status_code == 200
        assert resp.json()["status"] == "cycle started"


class TestLifespan:
    @pytest.mark.asyncio
    async def test_lifespan_auto_cycle_enabled(self):
        import main as main_mod
        original_task = main_mod._auto_cycle_task

        with patch.dict(os.environ, {"AUTO_CYCLE": "true"}), \
             patch("main._auto_cycle_loop", new_callable=AsyncMock) as mock_loop:
            # Create a mock task
            mock_task = MagicMock()
            mock_task.cancel = MagicMock()
            with patch("main.asyncio.create_task", side_effect=lambda c: c.close() or mock_task):
                async with main_mod.lifespan(main_mod.app):
                    assert main_mod._auto_cycle_task is mock_task

            mock_task.cancel.assert_called_once()

        main_mod._auto_cycle_task = original_task

    @pytest.mark.asyncio
    async def test_lifespan_auto_cycle_disabled(self):
        import main as main_mod
        original_task = main_mod._auto_cycle_task
        main_mod._auto_cycle_task = None

        with patch.dict(os.environ, {"AUTO_CYCLE": "false"}):
            async with main_mod.lifespan(main_mod.app):
                assert main_mod._auto_cycle_task is None

        main_mod._auto_cycle_task = original_task

    @pytest.mark.asyncio
    async def test_lifespan_no_task_to_cancel(self):
        import main as main_mod
        original_task = main_mod._auto_cycle_task
        main_mod._auto_cycle_task = None

        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("AUTO_CYCLE", None)
            async with main_mod.lifespan(main_mod.app):
                pass  # no task created

        main_mod._auto_cycle_task = original_task


class TestAutoCycleLoop:
    @pytest.mark.asyncio
    async def test_auto_cycle_loop_runs_and_handles_error(self):
        from main import _auto_cycle_loop
        call_count = 0

        async def mock_run_cycle():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("test error")
            # On second call, we'll cancel to stop the loop

        with patch("app.services.trade_loop.run_cycle", side_effect=mock_run_cycle), \
             patch("main.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            # Make sleep raise on second call to break out of the loop
            mock_sleep.side_effect = [None, asyncio.CancelledError()]
            with pytest.raises(asyncio.CancelledError):
                await _auto_cycle_loop()

        assert call_count == 2


class TestAppConfig:
    def test_app_title(self):
        from main import app
        assert app.title == "Turena Backend"

    def test_app_version(self):
        from main import app
        assert app.version == "0.1.0"

    def test_routers_included(self):
        from main import app
        routes = [r.path for r in app.routes]
        assert "/health" in routes
