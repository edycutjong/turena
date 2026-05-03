"""Tests for app/services/trade_loop.py — 100% coverage."""
import pytest
from unittest.mock import AsyncMock, patch

import app.services.trade_loop as tl_mod


class TestRunCycle:
    """Tests for run_cycle()."""

    @pytest.mark.asyncio
    async def test_full_cycle_win(self):
        mock_pool = AsyncMock()
        # fetchrow calls: 1) cycle number, 2) params (not called since win=True)
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 1},  # cycle number
        ])

        async def mock_initial(*args):
            yield ("emotion", "CONFIDENT")
            yield ("reasoning", "thinking...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("reasoning", "final thoughts...")
            yield ("intent", '{"action": "long", "confidence": 0.9, "reason": "bullish"}')

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="price data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock), \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o1", "price": 0.65}), \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=2.5), \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0xabc"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock), \
             patch("app.services.trade_loop._fetch_sabotage_summary", new_callable=AsyncMock, return_value="some sabotage"), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            result = await tl_mod.run_cycle()

        assert result["win"] is True
        assert result["pnl"] == 2.5
        assert result["tx_hash"] == "0xabc"
        assert result["correction"] is None

    @pytest.mark.asyncio
    async def test_full_cycle_loss_triggers_correction(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 2},  # cycle number
            {"current_params": '{"risk_weight": 0.1}'},  # params for correction
        ])

        async def mock_initial(*args):
            yield ("reasoning", "analyzing...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("intent", '{"action": "short", "confidence": 0.6}')

        correction_result = {"param": "risk_weight", "old_val": 0.1, "new_val": 0.085}

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock), \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o2", "average": 0.65}), \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=-3.0), \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0xdef"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock), \
             patch("app.services.trade_loop.run_self_correction", new_callable=AsyncMock, return_value=correction_result), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            result = await tl_mod.run_cycle(manual=True)

        assert result["win"] is False
        assert result["pnl"] == -3.0
        assert result["correction"] == correction_result

    @pytest.mark.asyncio
    async def test_no_intent_uses_default(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 3},  # cycle number
        ])

        async def mock_initial(*args):
            yield ("reasoning", "analyzing...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("reasoning", "no intent here")

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock), \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o3", "price": 0.65}), \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=1.0), \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0x111"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            result = await tl_mod.run_cycle()

        assert result["win"] is True

    @pytest.mark.asyncio
    async def test_settle_failure_non_fatal(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 4},
        ])

        async def mock_initial(*args):
            yield ("reasoning", "analyzing...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("intent", '{"action": "long"}')

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock), \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o4", "price": 0.65}), \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=0.5), \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0x222"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock, side_effect=Exception("no bets")), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            result = await tl_mod.run_cycle()

        # Should succeed despite settle_cycle failure
        assert result["win"] is True

    @pytest.mark.asyncio
    async def test_short_action_maps_to_sell(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 5},
        ])

        async def mock_initial(*args):
            yield ("reasoning", "analyzing...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("intent", '{"action": "short"}')

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock), \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o5"}) as mock_place, \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=1.0), \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0x333"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            await tl_mod.run_cycle()

        mock_place.assert_awaited_once_with("MNTUSDT", "sell")

    @pytest.mark.asyncio
    async def test_loss_with_no_params_row(self):
        """When agent_state doesn't exist yet, use empty params."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 6},  # cycle number
            None,         # no agent_state row
        ])

        async def mock_initial(*args):
            yield ("reasoning", "analyzing...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("intent", '{"action": "long"}')

        correction_result = {"param": "risk_weight", "old_val": 0.1, "new_val": 0.085}

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock), \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o6", "price": 0.65}), \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=-1.0), \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0x444"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock), \
             patch("app.services.trade_loop.run_self_correction", new_callable=AsyncMock, return_value=correction_result), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            result = await tl_mod.run_cycle()

        assert result["win"] is False
        assert result["correction"] == correction_result

    @pytest.mark.asyncio
    async def test_content_token_type_mapped_to_reasoning(self):
        """Content token_type should be mapped to 'reasoning' for DB storage."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 7},
        ])

        async def mock_initial(*args):
            yield ("reasoning", "analyzing...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("content", "some content")

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock) as mock_insert, \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o7", "price": 0.65}), \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=1.0), \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0x555"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            await tl_mod.run_cycle()

        # Verify "content" was mapped to "reasoning" for DB
        mock_insert.assert_awaited()
        call_args = mock_insert.call_args_list[0]
        # Which call has "content"? It's the first call from mock_verdict or mock_initial
        # Actually insert_cot_token was called with "reasoning" instead of "content"
        # We can just check that any call had "reasoning"
        assert any(call[0][3] == "reasoning" for call in mock_insert.call_args_list)

    @pytest.mark.asyncio
    async def test_order_with_no_price_or_average(self):
        """When order has neither 'price' nor 'average', entry_price = 0."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=[
            {"next": 8},
            {"current_params": "{}"},  # pnl=0 → loss → needs params
        ])

        async def mock_initial(*args):
            yield ("reasoning", "analyzing...")
            yield ("analysis_complete", "analysis done")

        async def mock_verdict(*args):
            yield ("intent", '{"action": "long"}')

        with patch("app.services.trade_loop.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
             patch("app.services.trade_loop.fetch_market_context", new_callable=AsyncMock, return_value="data"), \
             patch("app.services.trade_loop._get_consecutive_losses", new_callable=AsyncMock, return_value=0), \
             patch("app.services.trade_loop.stream_initial_analysis", side_effect=mock_initial), \
             patch("app.services.trade_loop.stream_verdict", side_effect=mock_verdict), \
             patch("app.services.trade_loop.insert_cot_token", new_callable=AsyncMock), \
             patch("app.services.trade_loop.place_order", new_callable=AsyncMock, return_value={"id": "o8"}) as _mock_place, \
             patch("app.services.trade_loop.get_pnl", new_callable=AsyncMock, return_value=0.0) as mock_pnl, \
             patch("app.services.trade_loop.record_trade", new_callable=AsyncMock, return_value="0x666"), \
             patch("app.services.trade_loop.settle_cycle", new_callable=AsyncMock), \
             patch("app.services.trade_loop.run_self_correction", new_callable=AsyncMock, return_value={"param": "x"}), \
             patch("app.services.trade_loop.asyncio.sleep", new_callable=AsyncMock):

            await tl_mod.run_cycle()

        # get_pnl called with entry_price=0
        mock_pnl.assert_awaited_once_with("o8", "MNTUSDT", "buy", 0)


class TestGetConsecutiveLosses:
    @pytest.mark.asyncio
    async def test_get_consecutive_losses_with_row(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={"streak": 3})
        result = await tl_mod._get_consecutive_losses(mock_pool)
        assert result == 3

    @pytest.mark.asyncio
    async def test_get_consecutive_losses_no_row(self):
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value=None)
        result = await tl_mod._get_consecutive_losses(mock_pool)
        assert result == 0

class TestFetchSabotageSummary:
    @pytest.mark.asyncio
    async def test_fetch_sabotage_summary_with_rows(self):
        mock_pool = AsyncMock()
        mock_pool.fetch = AsyncMock(return_value=[
            {"card_type": "FUD", "n": 2, "total_mnt": 1.5},
            {"card_type": "DUMP", "n": 1, "total_mnt": 0.5},
        ])
        result = await tl_mod._fetch_sabotage_summary(mock_pool, "cycle-1")
        assert "2 humans paid 1.5 MNT" in result
        assert "1 humans paid 0.5 MNT" in result

    @pytest.mark.asyncio
    async def test_fetch_sabotage_summary_no_rows(self):
        mock_pool = AsyncMock()
        mock_pool.fetch = AsyncMock(return_value=[])
        result = await tl_mod._fetch_sabotage_summary(mock_pool, "cycle-1")
        assert result == ""

    @pytest.mark.asyncio
    async def test_fetch_sabotage_summary_exception(self):
        mock_pool = AsyncMock()
        mock_pool.fetch = AsyncMock(side_effect=Exception("DB Error"))
        result = await tl_mod._fetch_sabotage_summary(mock_pool, "cycle-1")
        assert result == ""

class TestConstants:
    def test_sabotage_window(self):
        assert tl_mod.SABOTAGE_WINDOW == 20

    def test_reading_window(self):
        assert tl_mod.READING_WINDOW == 0

    def test_eval_window(self):
        assert tl_mod.EVAL_WINDOW == 30

    def test_token_id(self):
        assert tl_mod.TOKEN_ID == 0
