import os
import ccxt.async_support as ccxt


def get_exchange() -> ccxt.bybit:
    return ccxt.bybit({
        "apiKey":  os.getenv("BYBIT_API_KEY", ""),
        "secret":  os.getenv("BYBIT_API_SECRET", ""),
        "sandbox": os.getenv("BYBIT_TESTNET", "true").lower() == "true",
        "options": {"defaultType": "linear"},
    })


async def fetch_market_context(symbol: str = "MNTUSDT") -> str:
    ex = get_exchange()
    try:
        ticker   = await ex.fetch_ticker(symbol)
        book     = await ex.fetch_order_book(symbol, 5)
        last     = ticker.get("last", 0)
        change   = ticker.get("percentage", 0)
        bid      = book["bids"][0][0] if book["bids"] else last
        ask      = book["asks"][0][0] if book["asks"] else last
        spread   = round((ask - bid) / last * 100, 4) if last else 0
        return (
            f"{symbol} | Price: ${last:.4f} | 24h change: {change:+.2f}% | "
            f"Spread: {spread}% | Bid: {bid:.4f} | Ask: {ask:.4f} | "
            f"Volume 24h: {ticker.get('quoteVolume', 0):.0f} USDT"
        )
    finally:
        await ex.close()


async def place_order(symbol: str, side: str, amount_usdt: float = 10.0) -> dict:
    """Place a market order on Bybit Testnet. Returns order dict."""
    ex = get_exchange()
    try:
        ticker = await ex.fetch_ticker(symbol)
        price  = ticker["last"]
        qty    = round(amount_usdt / price, 4)
        order  = await ex.create_order(symbol, "market", side, qty)
        return order
    finally:
        await ex.close()


async def get_pnl(order_id: str, symbol: str, side: str, entry_price: float) -> float:
    """Estimate P&L by comparing entry to current mark price."""
    ex = get_exchange()
    try:
        ticker = await ex.fetch_ticker(symbol)
        current = ticker["last"]
        diff = (current - entry_price) if side == "buy" else (entry_price - current)
        return round(diff, 4)
    finally:
        await ex.close()
