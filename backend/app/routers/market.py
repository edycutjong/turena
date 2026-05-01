import os
import ccxt.async_support as ccxt
from fastapi import APIRouter

router = APIRouter()


def _bybit():
    return ccxt.bybit({
        "apiKey": os.getenv("BYBIT_API_KEY", ""),
        "secret": os.getenv("BYBIT_API_SECRET", ""),
        "sandbox": os.getenv("BYBIT_TESTNET", "true").lower() == "true",
    })


@router.get("/price")
async def get_price(symbol: str = "METH/USDT"):
    exchange = _bybit()
    try:
        ticker = await exchange.fetch_ticker(symbol)
        return {"symbol": symbol, "price": ticker["last"], "bid": ticker["bid"], "ask": ticker["ask"]}
    finally:
        await exchange.close()


@router.get("/orderbook")
async def get_orderbook(symbol: str = "METH/USDT", limit: int = 10):
    exchange = _bybit()
    try:
        book = await exchange.fetch_order_book(symbol, limit)
        return {"symbol": symbol, "bids": book["bids"][:limit], "asks": book["asks"][:limit]}
    finally:
        await exchange.close()
