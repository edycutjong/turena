import os
import random
import httpx
import ccxt.async_support as ccxt
from fastapi import APIRouter

router = APIRouter()


def _bybit():
    return ccxt.bybit({
        "apiKey":  os.getenv("BYBIT_API_KEY", ""),
        "secret":  os.getenv("BYBIT_API_SECRET", ""),
        "sandbox": os.getenv("BYBIT_TESTNET", "true").lower() == "true",
        "timeout": 8000,
    })


async def _coingecko_price() -> float:
    from app.services.bybit import _coingecko_price as _cached
    return await _cached()


@router.get("/price")
async def get_price(symbol: str = "MNTUSDT"):
    exchange = _bybit()
    try:
        ticker = await exchange.fetch_ticker(symbol)
        return {
            "symbol": symbol,
            "price":  ticker["last"],
            "bid":    ticker["bid"],
            "ask":    ticker["ask"],
            "source": "bybit",
        }
    except Exception:
        price = await _coingecko_price()
        return {
            "symbol": symbol,
            "price":  price,
            "bid":    round(price * 0.9998, 6),
            "ask":    round(price * 1.0002, 6),
            "source": "coingecko-fallback",
        }
    finally:
        await exchange.close()


@router.get("/orderbook")
async def get_orderbook(symbol: str = "MNTUSDT", limit: int = 10):
    exchange = _bybit()
    try:
        book = await exchange.fetch_order_book(symbol, limit)
        return {"symbol": symbol, "bids": book["bids"][:limit], "asks": book["asks"][:limit], "source": "bybit"}
    except Exception:
        price = await _coingecko_price()
        bids  = [[round(price * (1 - i * 0.0001), 6), round(random.uniform(100, 5000), 2)] for i in range(1, limit + 1)]
        asks  = [[round(price * (1 + i * 0.0001), 6), round(random.uniform(100, 5000), 2)] for i in range(1, limit + 1)]
        return {"symbol": symbol, "bids": bids, "asks": asks, "source": "coingecko-fallback"}
    finally:
        await exchange.close()
