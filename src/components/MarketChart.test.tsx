import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MarketChart } from "./MarketChart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children, data }: any) => <svg data-testid="area-chart" data-data={JSON.stringify(data)}>{children}</svg>,
  Area: () => <g />,
  XAxis: () => <g />,
  YAxis: () => <g />,
  Tooltip: ({ formatter }: any) => {
    (global as any).mockTooltipFormatter = formatter;
    return <g />;
  },
  ReferenceLine: () => <g />,
}));

describe("MarketChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches initial price and updates on tick", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        json: async () => ({ price: 0.95, source: "coingecko-fallback" }),
      } as any)
      .mockResolvedValueOnce({
        json: async () => ({ price: 1.05, source: "bybit" }),
      } as any)
      .mockResolvedValueOnce({
        json: async () => ({ price: null, source: "bybit" }), // falsy price test
      } as any)
      .mockResolvedValueOnce({
        json: async () => ({ price: 0.85, source: "coingecko-fallback" }), // negative isUp test
      } as any);

    let renderResult: any;
    await act(async () => {
      renderResult = render(<MarketChart symbol="MNTUSDT" />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/market/price?symbol=MNTUSDT");
    expect(renderResult.getByText("$0.9500")).toBeTruthy();
    expect(renderResult.getByText("CoinGecko")).toBeTruthy();

    const chart = renderResult.getByTestId("area-chart");
    const dataInitial = JSON.parse(chart.getAttribute("data-data") || "[]");
    expect(dataInitial.length).toBe(30);

    // Trigger first timer tick (10 seconds) -> price goes up to 1.05
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderResult.getByText("$1.0500")).toBeTruthy();
    expect(renderResult.getByText("Bybit")).toBeTruthy();

    // Trigger second timer tick -> price is null, should do nothing
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Price should still be 1.05
    expect(renderResult.getByText("$1.0500")).toBeTruthy();

    // Trigger third timer tick -> price goes down to 0.85
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderResult.getByText("$0.8500")).toBeTruthy();
    expect(renderResult.getByText("CoinGecko")).toBeTruthy();

    const dataUpdated = JSON.parse(chart.getAttribute("data-data") || "[]");
    expect(dataUpdated.length).toBe(32);
    expect(dataUpdated[31].price).toBe(0.85);

    const tooltipFormatter = (global as any).mockTooltipFormatter;
    expect(tooltipFormatter).toBeDefined();
    const formatted = tooltipFormatter(1.0456);
    expect(formatted).toEqual(["$1.0456", "MNT/USD"]);
  });

  it("handles initial fetch with no price gracefully", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({ price: null }),
    } as any);

    let renderResult: any;
    await act(async () => {
      renderResult = render(<MarketChart />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderResult.getByText("$0.0000")).toBeTruthy();
  });

  it("handles fetch errors gracefully", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));

    let renderResult: any;
    await act(async () => {
      renderResult = render(<MarketChart />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderResult.getByText("$0.0000")).toBeTruthy();

    // Trigger timer tick (10 seconds) with a rejected fetch
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    await act(async () => {
      await Promise.resolve();
    });
  });

  it("handles initial fetch from bybit source", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({ price: 0.98, source: "bybit" }),
    } as any);

    let renderResult: any;
    await act(async () => {
      renderResult = render(<MarketChart />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderResult.getByText("Bybit")).toBeTruthy();
  });
});
