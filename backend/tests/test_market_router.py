"""Tests for app/routers/market.py — 100% coverage."""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient, ASGITransport


class TestMarketRouterPrice:
    """Tests for GET /market/price."""

    @pytest.mark.asyncio
    async def test_price_success_bybit(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(return_value={
            "last": 0.65, "bid": 0.649, "ask": 0.651,
        })
        mock_ex.close = AsyncMock()

        with patch("app.routers.market._bybit", return_value=mock_ex):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/market/price?symbol=MNTUSDT")

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "bybit"
        assert data["price"] == 0.65

    @pytest.mark.asyncio
    async def test_price_fallback_coingecko(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_ticker = AsyncMock(side_effect=Exception("timeout"))
        mock_ex.close = AsyncMock()

        with patch("app.routers.market._bybit", return_value=mock_ex), \
             patch("app.routers.market._coingecko_price", new_callable=AsyncMock, return_value=0.63):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/market/price")

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "coingecko-fallback"
        assert data["price"] == 0.63


class TestMarketRouterOrderbook:
    """Tests for GET /market/orderbook."""

    @pytest.mark.asyncio
    async def test_orderbook_success(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_order_book = AsyncMock(return_value={
            "bids": [[0.649, 100], [0.648, 200]],
            "asks": [[0.651, 150], [0.652, 250]],
        })
        mock_ex.close = AsyncMock()

        with patch("app.routers.market._bybit", return_value=mock_ex):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/market/orderbook?symbol=MNTUSDT&limit=2")

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "bybit"
        assert len(data["bids"]) == 2
        assert len(data["asks"]) == 2

    @pytest.mark.asyncio
    async def test_orderbook_fallback(self):
        mock_ex = AsyncMock()
        mock_ex.fetch_order_book = AsyncMock(side_effect=Exception("err"))
        mock_ex.close = AsyncMock()

        with patch("app.routers.market._bybit", return_value=mock_ex), \
             patch("app.routers.market._coingecko_price", new_callable=AsyncMock, return_value=0.63):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/market/orderbook?limit=5")

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "coingecko-fallback"
        assert len(data["bids"]) == 5


class TestBybitFactory:
    """Tests for _bybit() factory."""

    def test_creates_exchange(self):
        from app.routers.market import _bybit
        with patch.dict(os.environ, {
            "BYBIT_API_KEY": "k", "BYBIT_API_SECRET": "s", "BYBIT_TESTNET": "true"
        }):
            ex = _bybit()
            assert ex is not None


class TestCoingeckoPriceProxy:
    """Tests for _coingecko_price() proxy."""

    @pytest.mark.asyncio
    async def test_delegates_to_bybit_module(self):
        with patch("app.services.bybit._coingecko_price", new_callable=AsyncMock, return_value=0.77):
            from app.routers.market import _coingecko_price
            result = await _coingecko_price()
            assert result == 0.77
