"""Tests for app/services/bybit.py — 100% coverage."""
import os
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import app.services.bybit as bybit_mod


class TestExchange:
    """Tests for _exchange()."""

    @pytest.mark.asyncio
    async def test_creates_exchange_with_defaults(self):
        with patch.dict(os.environ, {
            "BYBIT_API_KEY": "key",
            "BYBIT_API_SECRET": "secret",
            "BYBIT_TESTNET": "true",
        }):
            ex = bybit_mod._exchange()
            assert ex is not None
            assert ex.apiKey == "key"
            await ex.close()

    @pytest.mark.asyncio
    async def test_sandbox_false(self):
        with patch.dict(os.environ, {
            "BYBIT_API_KEY": "k",
            "BYBIT_API_SECRET": "s",
            "BYBIT_TESTNET": "false",
        }):
            ex = bybit_mod._exchange()
            assert ex.sandbox is False
            await ex.close()


class TestCoingeckoPrice:
    """Tests for _coingecko_price()."""

    @pytest.mark.asyncio
    async def test_returns_cached_price(self):
        bybit_mod._cg_cache = (0.75, time.time())
        result = await bybit_mod._coingecko_price()
        assert result == 0.75
        bybit_mod._cg_cache = (0.63, 0.0)  # reset

    @pytest.mark.asyncio
    async def test_fetches_fresh_price(self):
        bybit_mod._cg_cache = (0.63, 0.0)  # expired (ts=0)
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"mantle": {"usd": 0.88}}
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.bybit.httpx.AsyncClient", return_value=mock_client):
            result = await bybit_mod._coingecko_price()
            assert result == 0.88
        bybit_mod._cg_cache = (0.63, 0.0)  # reset

    @pytest.mark.asyncio
    async def test_returns_default_on_error(self):
        bybit_mod._cg_cache = (0.63, 0.0)  # expired

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=Exception("network error"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.bybit.httpx.AsyncClient", return_value=mock_client):
            result = await bybit_mod._coingecko_price()
            assert result == 0.63
        bybit_mod._cg_cache = (0.63, 0.0)  # reset

    @pytest.mark.asyncio
    async def test_missing_mantle_key_uses_cached(self):
        bybit_mod._cg_cache = (0.55, 0.0)

        mock_resp = MagicMock()
        mock_resp.json.return_value = {}  # no "mantle" key
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.bybit.httpx.AsyncClient", return_value=mock_client):
            result = await bybit_mod._coingecko_price()
            assert result == 0.55  # falls back to cached price
        bybit_mod._cg_cache = (0.63, 0.0)  # reset


class TestFetchMarketContext:
    """Tests for fetch_market_context()."""

    @pytest.mark.asyncio
    async def test_success_path(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={
            "last": 0.65, "percentage": 2.5, "quoteVolume": 100000
        })
        mock_ex.fetch_order_book = AsyncMock(return_value={
            "bids": [[0.649, 100]], "asks": [[0.651, 100]]
        })
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex):
            result = await bybit_mod.fetch_market_context("MNTUSDT")

        assert "MNTUSDT" in result
        assert "0.6500" in result
        assert "+2.50%" in result
        mock_ex.close.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_success_with_empty_orderbook(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={
            "last": 0.65, "percentage": 1.0, "quoteVolume": 5000
        })
        mock_ex.fetch_order_book = AsyncMock(return_value={
            "bids": [], "asks": []
        })
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex):
            result = await bybit_mod.fetch_market_context()

        assert "Spread: 0.0%" in result

    @pytest.mark.asyncio
    async def test_success_with_zero_last(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={
            "last": 0, "percentage": 0, "quoteVolume": 0
        })
        mock_ex.fetch_order_book = AsyncMock(return_value={
            "bids": [], "asks": []
        })
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex):
            result = await bybit_mod.fetch_market_context()

        assert "Spread: 0%" in result

    @pytest.mark.asyncio
    async def test_fallback_path(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(side_effect=Exception("timeout"))
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex), \
             patch("app.services.bybit._coingecko_price", new_callable=AsyncMock, return_value=0.63):
            result = await bybit_mod.fetch_market_context("MNTUSDT")

        assert "CoinGecko fallback" in result
        assert "MNTUSDT" in result
        mock_ex.close.assert_awaited_once()


class TestPlaceOrder:
    """Tests for place_order()."""

    @pytest.mark.asyncio
    async def test_success_path(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={"last": 0.65})
        mock_ex.create_order = AsyncMock(return_value={"id": "order-1", "status": "closed"})
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex):
            result = await bybit_mod.place_order("MNTUSDT", "buy", 10.0)

        assert result["id"] == "order-1"
        mock_ex.close.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_fallback_simulated_order(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(side_effect=Exception("blocked"))
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex), \
             patch("app.services.bybit._coingecko_price", new_callable=AsyncMock, return_value=0.63):
            result = await bybit_mod.place_order("MNTUSDT", "sell", 10.0)

        assert result["simulated"] is True
        assert result["side"] == "sell"
        assert result["id"].startswith("sim-")
        mock_ex.close.assert_awaited_once()


class TestGetPnl:
    """Tests for get_pnl()."""

    @pytest.mark.asyncio
    async def test_success_buy_profit(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={"last": 0.70})
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex):
            result = await bybit_mod.get_pnl("order-1", "MNTUSDT", "buy", 0.65)

        expected_diff = 0.70 - 0.65
        expected_qty = 10.0 / 0.65
        expected = round(expected_diff * expected_qty, 4)
        assert result == expected

    @pytest.mark.asyncio
    async def test_success_sell_profit(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={"last": 0.60})
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex):
            result = await bybit_mod.get_pnl("order-2", "MNTUSDT", "sell", 0.65)

        expected_diff = 0.65 - 0.60
        expected_qty = 10.0 / 0.65
        expected = round(expected_diff * expected_qty, 4)
        assert result == expected

    @pytest.mark.asyncio
    async def test_fallback_price(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(side_effect=Exception("err"))
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex), \
             patch("app.services.bybit._coingecko_price", new_callable=AsyncMock, return_value=0.63):
            result = await bybit_mod.get_pnl("o1", "MNTUSDT", "buy", 0.63)

        assert result == 0.0  # current == entry → 0 pnl

    @pytest.mark.asyncio
    async def test_zero_entry_price(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={"last": 0.65})
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex):
            result = await bybit_mod.get_pnl("o2", "MNTUSDT", "buy", 0)

        # entry_price becomes current (0.65), diff = 0, qty = 10/0.65
        assert result == 0.0

    @pytest.mark.asyncio
    async def test_zero_entry_price_with_zero_current(self):
        """When entry_price is 0 and current is also 0, qty falls back to 1.0."""
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(side_effect=Exception("err"))
        mock_ex.close = AsyncMock()

        with patch("app.services.bybit._exchange", return_value=mock_ex), \
             patch("app.services.bybit._coingecko_price", new_callable=AsyncMock, return_value=0.0):
            # entry_price=0, current=0 → entry_price set to current (0) → qty = 1.0
            result = await bybit_mod.get_pnl("o3", "MNTUSDT", "buy", 0)

        assert result == 0.0
