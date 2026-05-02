"""Bybit (via ccxt) with CoinGecko fallback.

On Railway/Vercel (US-EU): Bybit testnet is reachable — real orders, real P&L.
In region-blocked environments: falls back to CoinGecko price + simulated orders.
"""
import os
import random
import httpx
import ccxt.async_support as ccxt


def _exchange() -> ccxt.bybit:
    return ccxt.bybit({
        "apiKey":  os.getenv("BYBIT_API_KEY", ""),
        "secret":  os.getenv("BYBIT_API_SECRET", ""),
        "sandbox": os.getenv("BYBIT_TESTNET", "true").lower() == "true",
        "options": {"defaultType": "linear"},
        "timeout": 8000,
    })


_cg_cache: tuple[float, float] = (0.0, 0.0)  # (price, timestamp)

async def _coingecko_price() -> float:
    import time
    global _cg_cache
    price, ts = _cg_cache
    if price and (time.time() - ts) < 60:  # cache for 60 seconds
        return price
    url = "https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd"
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(url)
        r.raise_for_status()
        price = r.json().get("mantle", {}).get("usd", 0.63)
        _cg_cache = (price, time.time())
        return price


# ---------------------------------------------------------------------------

async def fetch_market_context(symbol: str = "MNTUSDT") -> str:
    ex = _exchange()
    try:
        ticker = await ex.fetch_ticker(symbol)
        book   = await ex.fetch_order_book(symbol, 5)
        last   = ticker.get("last", 0)
        change = ticker.get("percentage", 0)
        bid    = book["bids"][0][0] if book["bids"] else last
        ask    = book["asks"][0][0] if book["asks"] else last
        spread = round((ask - bid) / last * 100, 4) if last else 0
        return (
            f"{symbol} | Price: ${last:.4f} | 24h change: {change:+.2f}% | "
            f"Spread: {spread}% | Bid: {bid:.4f} | Ask: {ask:.4f} | "
            f"Volume 24h: {ticker.get('quoteVolume', 0):.0f} USDT"
        )
    except Exception:
        # Bybit unreachable — use CoinGecko
        price  = await _coingecko_price()
        change = 0.0
        spread = round(random.uniform(0.01, 0.05), 4)
        bid    = round(price * (1 - spread / 200), 6)
        ask    = round(price * (1 + spread / 200), 6)
        return (
            f"{symbol} | Price: ${price:.6f} | 24h change: {change:+.2f}% | "
            f"Spread: {spread}% | Bid: {bid:.6f} | Ask: {ask:.6f} | "
            f"Volume 24h: $0 (CoinGecko fallback)"
        )
    finally:
        await ex.close()


async def place_order(symbol: str, side: str, amount_usdt: float = 10.0) -> dict:
    ex = _exchange()
    try:
        ticker = await ex.fetch_ticker(symbol)
        price  = ticker["last"]
        qty    = round(amount_usdt / price, 4)
        order  = await ex.create_order(symbol, "market", side, qty)
        return order
    except Exception:
        # Simulated order against live CoinGecko price
        price    = await _coingecko_price()
        order_id = f"sim-{random.randint(100000, 999999)}"
        return {
            "id":        order_id,
            "symbol":    symbol,
            "side":      side,
            "price":     price,
            "average":   price,
            "amount":    round(amount_usdt / price, 4),
            "status":    "closed",
            "simulated": True,
        }
    finally:
        await ex.close()


async def get_pnl(order_id: str, symbol: str, side: str, entry_price: float) -> float:
    ex = _exchange()
    try:
        ticker  = await ex.fetch_ticker(symbol)
        current = ticker["last"]
    except Exception:
        current = await _coingecko_price()
    finally:
        await ex.close()

    if not entry_price:
        entry_price = current
    diff = (current - entry_price) if side == "buy" else (entry_price - current)
    qty  = 10.0 / entry_price if entry_price else 1.0
    return round(diff * qty, 4)
