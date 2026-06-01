import random
import httpx
import ccxt.async_support as ccxt
import os
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Bybit mainnet public REST — no auth, no sandbox, works from Railway
_BYBIT_TICKER_URL = "https://api.bybit.com/v5/market/tickers"


async def _bybit_spot_price(symbol: str) -> dict:
    """Direct Bybit mainnet public ticker — bypasses ccxt sandbox routing."""
    async with httpx.AsyncClient(timeout=6) as client:
        # Try spot first, then linear (perpetual)
        for category in ("spot", "linear"):
            r = await client.get(_BYBIT_TICKER_URL, params={"category": category, "symbol": symbol})
            r.raise_for_status()
            data = r.json()
            items = data.get("result", {}).get("list", [])
            if items:
                t = items[0]
                price = float(t.get("lastPrice") or t.get("last") or 0)
                bid   = float(t.get("bid1Price") or t.get("bidPrice") or price * 0.9998)
                ask   = float(t.get("ask1Price") or t.get("askPrice") or price * 1.0002)
                if price:
                    return {"price": price, "bid": bid, "ask": ask}
    raise ValueError(f"No Bybit price for {symbol}")


async def _coingecko_price() -> float:
    from app.services.bybit import _coingecko_price as _cached
    return await _cached()


def _bybit_ccxt():
    return ccxt.bybit({
        "apiKey":  os.getenv("BYBIT_API_KEY", ""),
        "secret":  os.getenv("BYBIT_API_SECRET", ""),
        "sandbox": os.getenv("BYBIT_TESTNET", "true").lower() == "true",
        "options": {"defaultType": "linear"},
        "timeout": 8000,
    })


@router.get("/price")
async def get_price(symbol: str = "MNTUSDT"):
    # 1. Bybit mainnet public REST (no auth, no sandbox)
    try:
        t = await _bybit_spot_price(symbol)
        return {"symbol": symbol, "price": t["price"], "bid": t["bid"], "ask": t["ask"], "source": "bybit"}
    except Exception:
        pass

    # 2. CoinGecko fallback
    try:
        price = await _coingecko_price()
        return {
            "symbol": symbol,
            "price":  price,
            "bid":    round(price * 0.9998, 6),
            "ask":    round(price * 1.0002, 6),
            "source": "coingecko-fallback",
        }
    except Exception:
        pass

    # 3. Gate.io fallback
    try:
        gate_symbol = "MNT_USDT" if symbol == "MNTUSDT" else symbol
        async with httpx.AsyncClient(timeout=6) as client:
            r = await client.get(f"https://api.gateio.ws/api/v4/spot/tickers?currency_pair={gate_symbol}")
            r.raise_for_status()
            data = r.json()
            if data and len(data) > 0:
                ticker = data[0]
                price = float(ticker["last"])
                bid = float(ticker["highest_bid"]) if ticker.get("highest_bid") else round(price * 0.9998, 6)
                ask = float(ticker["lowest_ask"]) if ticker.get("lowest_ask") else round(price * 1.0002, 6)
                return {"symbol": symbol, "price": price, "bid": bid, "ask": ask, "source": "gateio-fallback"}
    except Exception:
        pass
        
    raise HTTPException(status_code=503, detail="All pricing sources failed")


@router.get("/orderbook")
async def get_orderbook(symbol: str = "MNTUSDT", limit: int = 10):
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            for category in ("spot", "linear"):
                r = await client.get(
                    "https://api.bybit.com/v5/market/orderbook",
                    params={"category": category, "symbol": symbol, "limit": limit},
                )
                r.raise_for_status()
                data = r.json()
                result = data.get("result", {})
                if result.get("b") or result.get("bids"):
                    bids = result.get("b") or result.get("bids") or []
                    asks = result.get("a") or result.get("asks") or []
                    return {
                        "symbol": symbol,
                        "bids":   [[float(b[0]), float(b[1])] for b in bids[:limit]],
                        "asks":   [[float(a[0]), float(a[1])] for a in asks[:limit]],
                        "source": "bybit",
                    }
    except Exception:
        pass

    price = await _coingecko_price()
    bids  = [[round(price * (1 - i * 0.0001), 6), round(random.uniform(100, 5000), 2)] for i in range(1, limit + 1)]
    asks  = [[round(price * (1 + i * 0.0001), 6), round(random.uniform(100, 5000), 2)] for i in range(1, limit + 1)]
    return {"symbol": symbol, "bids": bids, "asks": asks, "source": "coingecko-fallback"}
