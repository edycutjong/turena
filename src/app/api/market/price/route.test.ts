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

  it("returns price from mock if both backend and coingecko fail", async () => {
    vi.spyOn(global, "fetch")
      // First call (backend) fails
      .mockResolvedValueOnce({ ok: false, status: 500 } as any)
      // Second call (coingecko) fails
      .mockResolvedValueOnce({ ok: false, status: 500 } as any);

    vi.spyOn(Math, "random").mockReturnValue(0.5); // price = 0.63 + 0 = 0.63

    const req = new NextRequest("http://localhost:3000/api/market/price?symbol=MNTUSDT");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(0.63);
    expect(data.source).toBe("mock-fallback");
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

  it("falls to mock if coingecko response has ok status but missing price field", async () => {
    vi.spyOn(global, "fetch")
      // Backend fails
      .mockResolvedValueOnce({ ok: false } as any)
      // Coingecko returns response without mantle.usd price
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mantle: {} }),
      } as any);

    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const req = new NextRequest("http://localhost:3000/api/market/price");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(0.63);
    expect(data.source).toBe("mock-fallback");
  });
});
