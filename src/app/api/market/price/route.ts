import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

async function fromBackend(symbol: string) {
  const res = await fetch(
    `${BACKEND_URL}/market/price?symbol=${encodeURIComponent(symbol)}`,
    { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const data = await res.json();
  if (!data.price) throw new Error("no price in backend response");
  return data;
}

async function fromCoinGecko() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_24hr_change=true",
    { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const data = await res.json();
  const price = data?.mantle?.usd;
  if (!price) throw new Error("no price from coingecko");
  return {
    symbol: "MNTUSDT",
    price,
    bid:    parseFloat((price * 0.9998).toFixed(6)),
    ask:    parseFloat((price * 1.0002).toFixed(6)),
    change: data?.mantle?.usd_24h_change ?? 0,
    source: "coingecko-fallback",
  };
}

async function fromGateIO(symbol: string) {
  // Gate.io uses MNT_USDT format
  const gateSymbol = symbol === "MNTUSDT" ? "MNT_USDT" : symbol;
  const res = await fetch(
    `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${gateSymbol}`,
    { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`gateio ${res.status}`);
  const data = await res.json();
  if (!data || data.length === 0) throw new Error("no price from gateio");
  
  const ticker = data[0];
  const price = parseFloat(ticker.last);
  return {
    symbol,
    price,
    bid: parseFloat(ticker.highest_bid) || parseFloat((price * 0.9998).toFixed(6)),
    ask: parseFloat(ticker.lowest_ask) || parseFloat((price * 1.0002).toFixed(6)),
    change: parseFloat(ticker.change_percentage) || 0,
    source: "gateio-fallback",
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "MNTUSDT";

  try {
    return NextResponse.json(await fromBackend(symbol));
  } catch {
    try {
      return NextResponse.json(await fromCoinGecko());
    } catch {
      try {
        return NextResponse.json(await fromGateIO(symbol));
      } catch {
        return NextResponse.json({ error: "All pricing sources failed" }, { status: 503 });
      }
    }
  }
}
