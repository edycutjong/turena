"""Tests for app/routers/market.py — 100% coverage."""
import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from httpx import AsyncClient, ASGITransport
from app.routers.market import _bybit_spot_price


class MockResponse:
    def __init__(self, json_data, status_code=200):
        self._json = json_data
        self.status_code = status_code
    def json(self): return self._json
    def raise_for_status(self): pass

class MockAsyncClientSuccess:
    def __init__(self, *args, **kwargs): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass
    async def get(self, *args, **kwargs):
        if "orderbook" in args[0]:
            return MockResponse({
                "result": {
                    "b": [["0.649", "100"]],
                    "a": [["0.651", "150"]]
                }
            })
        return MockResponse({
            "result": {
                "list": [{"lastPrice": "0.65", "bid1Price": "0.649", "ask1Price": "0.651"}]
            }
        })

class MockAsyncClientEmptyList:
    def __init__(self, *args, **kwargs): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass
    async def get(self, *args, **kwargs):
        return MockResponse({"result": {"list": []}})


class MockAsyncClientError:
    def __init__(self, *args, **kwargs): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass
    async def get(self, *args, **kwargs):
        raise Exception("err")


class TestBybitSpotPrice:
    @pytest.mark.asyncio
    async def test_success(self):
        with patch("app.routers.market.httpx.AsyncClient", new=MockAsyncClientSuccess):
            res = await _bybit_spot_price("MNTUSDT")
            assert res["price"] == 0.65

    @pytest.mark.asyncio
    async def test_empty_list_raises_value_error(self):
        with patch("app.routers.market.httpx.AsyncClient", new=MockAsyncClientEmptyList):
            with pytest.raises(ValueError):
                await _bybit_spot_price("MNTUSDT")


class TestMarketRouterPrice:
    """Tests for GET /market/price."""

    @pytest.mark.asyncio
    async def test_price_success_bybit(self):
        with patch("app.routers.market.httpx.AsyncClient", new=MockAsyncClientSuccess):
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
        with patch("app.routers.market.httpx.AsyncClient", new=MockAsyncClientError), \
             patch("app.routers.market._coingecko_price", new_callable=AsyncMock, return_value=0.63):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/market/price")

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "coingecko-fallback"
        assert data["price"] == 0.63

    @pytest.mark.asyncio
    async def test_price_last_resort_mock(self):
        with patch("app.routers.market.httpx.AsyncClient", new=MockAsyncClientError), \
             patch("app.routers.market._coingecko_price", new_callable=AsyncMock, side_effect=Exception("err")):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/market/price")

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "mock-fallback"
        assert 0.62 <= data["price"] <= 0.64


class TestMarketRouterOrderbook:
    """Tests for GET /market/orderbook."""

    @pytest.mark.asyncio
    async def test_orderbook_success(self):
        with patch("app.routers.market.httpx.AsyncClient", new=MockAsyncClientSuccess):
            from main import app
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/market/orderbook?symbol=MNTUSDT&limit=1")

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "bybit"
        assert len(data["bids"]) == 1
        assert len(data["asks"]) == 1

    @pytest.mark.asyncio
    async def test_orderbook_fallback(self):
        with patch("app.routers.market.httpx.AsyncClient", new=MockAsyncClientError), \
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
    """Tests for _bybit_ccxt() factory."""

    @pytest.mark.asyncio
    async def test_creates_exchange(self):
        from app.routers.market import _bybit_ccxt
        with patch.dict(os.environ, {
            "BYBIT_API_KEY": "k", "BYBIT_API_SECRET": "s", "BYBIT_TESTNET": "true"
        }):
            ex = _bybit_ccxt()
            assert ex is not None
            await ex.close()


class TestCoingeckoPriceProxy:
    """Tests for _coingecko_price() proxy."""

    @pytest.mark.asyncio
    async def test_delegates_to_bybit_module(self):
        with patch("app.services.bybit._coingecko_price", new_callable=AsyncMock, return_value=0.77):
            from app.routers.market import _coingecko_price
            result = await _coingecko_price()
            assert result == 0.77
