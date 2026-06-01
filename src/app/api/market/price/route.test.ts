import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("api/market/price route", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", "http://test-backend");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns price from backend if backend call succeeds", async () => {
    const mockResponse = { price: 0.95, symbol: "MNTUSDT", bid: 0.949, ask: 0.951, change: 1.5, source: "bybit" };
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price?symbol=MNTUSDT");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(0.95);
    expect(data.source).toBe("bybit");
    expect(fetchSpy).toHaveBeenCalledWith("http://localhost:8000/market/price?symbol=MNTUSDT", expect.any(Object));
  });

  it("returns price from coingecko if backend call fails but coingecko succeeds", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      // First call (backend) fails
      .mockResolvedValueOnce({ ok: false, status: 500 } as any)
      // Second call (coingecko) succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mantle: { usd: 0.88, usd_24h_change: -2.3 } }),
      } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price?symbol=MNTUSDT");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(0.88);
    expect(data.source).toBe("coingecko-fallback");
    expect(data.change).toBe(-2.3);
  });

  it("returns price from gateio if both backend and coingecko fail", async () => {
    vi.spyOn(global, "fetch")
      // First call (backend) fails
      .mockResolvedValueOnce({ ok: false, status: 500 } as any)
      // Second call (coingecko) fails
      .mockResolvedValueOnce({ ok: false, status: 500 } as any)
      // Third call (gateio) succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ last: "0.65", highest_bid: "0.64", lowest_ask: "0.66", change_percentage: "-1.5" }]),
      } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price?symbol=MNTUSDT");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(0.65);
    expect(data.source).toBe("gateio-fallback");
  });

  it("defaults to symbol MNTUSDT if not specified", async () => {
    const mockResponse = { price: 0.95, symbol: "MNTUSDT", source: "bybit" };
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.symbol).toBe("MNTUSDT");
  });

  it("falls to coingecko if backend does not return price", async () => {
    vi.spyOn(global, "fetch")
      // Backend returns valid json but no price field
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any)
      // Coingecko succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mantle: { usd: 0.88 } }),
      } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(0.88);
    expect(data.source).toBe("coingecko-fallback");
  });

  it("falls to gateio if coingecko response has ok status but missing price field", async () => {
    vi.spyOn(global, "fetch")
      // Backend fails
      .mockResolvedValueOnce({ ok: false } as any)
      // Coingecko returns response without mantle.usd price
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mantle: {} }),
      } as any)
      // Gateio succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ last: "0.65" }]),
      } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(0.65);
    expect(data.source).toBe("gateio-fallback");
  });

  it("returns 503 error if backend, coingecko, and gateio fail", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 500 } as any)
      .mockResolvedValueOnce({ ok: false, status: 500 } as any)
      .mockResolvedValueOnce({ ok: false, status: 500 } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price?symbol=MNTUSDT");
    const res = await GET(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("All pricing sources failed");
  });
  it("uses provided symbol for gateio fallback if not MNTUSDT", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: false } as any)
      .mockResolvedValueOnce({ ok: false } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ last: "123.45" }]),
      } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price?symbol=BTC_USDT");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenNthCalledWith(3, "https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT", expect.any(Object));
  });

  it("fails gateio fallback if response data is empty", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: false } as any)
      .mockResolvedValueOnce({ ok: false } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      } as any);

    const req = new NextRequest("http://localhost:3000/api/market/price?symbol=MNTUSDT");
    const res = await GET(req);
    expect(res.status).toBe(503);
  });
});
