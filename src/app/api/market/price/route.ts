import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "METH/USDT";
  try {
    const res = await fetch(
      `${BACKEND_URL}/market/price?symbol=${encodeURIComponent(symbol)}`,
      { next: { revalidate: 0 } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "backend unavailable" }, { status: 503 });
  }
}
