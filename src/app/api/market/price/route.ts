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

function mockPrice(symbol: string) {
  const base = 0.63;
  const jitter = (Math.random() - 0.5) * 0.004;
  const price = parseFloat((base + jitter).toFixed(6));
  return {
    symbol,
    price,
    bid: parseFloat((price * 0.9998).toFixed(6)),
    ask: parseFloat((price * 1.0002).toFixed(6)),
    change: 0,
    source: "mock-fallback",
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
      // CoinGecko rate-limited or unreachable — return mock so the chart renders
      return NextResponse.json(mockPrice(symbol));
    }
  }
}
