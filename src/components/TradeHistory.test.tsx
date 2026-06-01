import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradeHistory } from "./TradeHistory";
import { supabase } from "@/lib/supabase";
import { playWin, playLoss } from "@/lib/sounds";

vi.mock("@/lib/sounds", () => ({
  playWin: vi.fn(),
  playLoss: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  let tradeCallback: any;
  let corrCallback: any;

  function createMockBuilder(table = "") {
    const builder: any = {
      from: vi.fn().mockImplementation((t) => createMockBuilder(t)),
      select: vi.fn().mockImplementation(() => builder),
      neq: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
      then: vi.fn().mockImplementation((onfulfilled) => {
        const data = table === "trade_cycles" 
          ? (global as any).mockTradesData 
          : (global as any).mockCorrectionsData;
        return Promise.resolve({ data }).then(onfulfilled);
      }),
    };
    return builder;
  }

  const mockTradeChannel = {
    on: vi.fn().mockImplementation((event, filter, callback) => {
      tradeCallback = callback;
      return mockTradeChannel;
    }),
    subscribe: vi.fn().mockReturnThis(),
  };

  const mockCorrChannel = {
    on: vi.fn().mockImplementation((event, filter, callback) => {
      corrCallback = callback;
      return mockCorrChannel;
    }),
    subscribe: vi.fn().mockReturnThis(),
  };

  const mockSupabaseClient = {
    ...createMockBuilder(),
    channel: vi.fn().mockImplementation((name) => {
      if (name.startsWith("trade-history-corrections")) return mockCorrChannel;
      return mockTradeChannel;
    }),
    removeChannel: vi.fn(),
    triggerTradeUpdate: (payload: any) => tradeCallback(payload),
    triggerCorrInsert: (payload: any) => corrCallback(payload),
  };

  return {
    supabase: mockSupabaseClient,
  };
});

describe("TradeHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).mockTradesData = [];
    (global as any).mockCorrectionsData = [];
  });

  it("renders loading state initially and then empty list when no data is fetched", async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(<TradeHistory />);
    });
    
    await act(async () => {
      await Promise.resolve();
    });

    expect(renderResult.getByText("No completed trades yet")).toBeTruthy();
  });

  it("renders fetched trade and correction history items and handles realtime updates", async () => {
    const mockTrades = [
      {
        id: "t1",
        cycle_number: 5,
        intent: { action: "long", asset: "MNT" },
        result: "win",
        pnl_mnt: 1.25,
        self_corrected: true,
        tx_hash: "0xtx1234567890",
        created_at: "2026-05-30T10:00:00Z",
      },
      {
        id: "t2",
        cycle_number: 4,
        intent: { action: "short", asset: "BTC" },
        result: "loss",
        pnl_mnt: -2.1,
        self_corrected: false,
        tx_hash: null,
        created_at: "2026-05-30T09:00:00Z",
      },
      {
        id: "t3",
        cycle_number: 3,
        intent: null, // null intent test
        result: "win",
        pnl_mnt: null, // null pnl test
        self_corrected: false,
        tx_hash: null,
        created_at: "2026-05-30T08:00:00Z",
      },
    ];

    const mockCorrections = [
      {
        id: "c1",
        parameter_changed: "tolerance",
        old_value: "0.5",
        new_value: "0.3",
        regret_score: 90,
        tx_hash: "0xtxcorr123456",
        created_at: "2026-05-30T09:30:00Z",
      },
    ];

    (global as any).mockTradesData = mockTrades;
    (global as any).mockCorrectionsData = mockCorrections;

    let renderResult: any;
    await act(async () => {
      renderResult = render(<TradeHistory />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Verify trades list rendering
    expect(renderResult.getByText("#5")).toBeTruthy();
    expect(renderResult.container.textContent.toLowerCase()).toContain("long mnt");
    expect(renderResult.getAllByText("WIN").length).toBe(2);
    expect(renderResult.getByText("+1.25")).toBeTruthy();
    expect(renderResult.getByText("0xtx1234…")).toBeTruthy();
    expect(renderResult.getByText("⚡")).toBeTruthy(); // corrected indicator

    expect(renderResult.getByText("#4")).toBeTruthy();
    expect(renderResult.container.textContent.toLowerCase()).toContain("short btc");
    expect(renderResult.getByText("LOSS")).toBeTruthy();
    expect(renderResult.getByText("-2.10")).toBeTruthy();

    expect(renderResult.getByText("#3")).toBeTruthy();
    expect(renderResult.container.textContent.toLowerCase()).toContain("—"); // intent action fallback
    expect(renderResult.getAllByText("—").length).toBeGreaterThan(0); // pnl fallback

    // Verify self-corrections rendering (sorted by created_at in between the two trades)
    expect(renderResult.getByText("⚡ CORRECTION")).toBeTruthy();
    expect(renderResult.getByText("tolerance")).toBeTruthy();
    expect(renderResult.getByText("0.500")).toBeTruthy();
    expect(renderResult.getByText("0.300")).toBeTruthy();
    expect(renderResult.getByText("-90")).toBeTruthy();
    expect(renderResult.getByText("0xtxcorr…")).toBeTruthy();

    // Trigger realtime insert for a new self correction
    await act(async () => {
      (supabase as any).triggerCorrInsert({
        new: {
          id: "c2",
          parameter_changed: "threshold",
          old_value: "0.1",
          new_value: "0.2",
          regret_score: 45,
          tx_hash: null,
          created_at: "2026-05-30T10:15:00Z",
        },
      });
    });

    expect(renderResult.getByText("threshold")).toBeTruthy();
    expect(renderResult.getByText("-45")).toBeTruthy();

    // Trigger realtime update for an updated trade cycle settling to pending (should early return)
    await act(async () => {
      (supabase as any).triggerTradeUpdate({
        new: {
          id: "t-pending",
          cycle_number: 7,
          intent: null,
          result: "pending",
          pnl_mnt: null,
          self_corrected: false,
          tx_hash: null,
          created_at: "2026-05-30T10:20:00Z",
        },
      });
    });

    expect(renderResult.queryByText("#7")).toBeNull();

    // Trigger realtime update for an existing trade cycle settling
    // Let's settle cycle "t2" as "win" (should NOT trigger sound because t2 was already in set)
    await act(async () => {
      (supabase as any).triggerTradeUpdate({
        new: {
          id: "t2",
          cycle_number: 4,
          intent: { action: "short", asset: "BTC" },
          result: "win",
          pnl_mnt: 3.5,
          self_corrected: false,
          tx_hash: "0xsomehash",
          created_at: "2026-05-30T09:00:00Z",
        },
      });
    });

    expect(playWin).not.toHaveBeenCalled();
    expect(renderResult.getByText("+3.50")).toBeTruthy();

    // Trigger realtime update for a BRAND NEW trade cycle settling (should trigger sound)
    await act(async () => {
      (supabase as any).triggerTradeUpdate({
        new: {
          id: "t-new-loss",
          cycle_number: 6,
          intent: { action: "long", asset: "MNT" },
          result: "loss",
          pnl_mnt: -1.0,
          self_corrected: false,
          tx_hash: "0xtxnew",
          created_at: "2026-05-30T10:30:00Z",
        },
      });
    });

    expect(playLoss).toHaveBeenCalled();
    expect(renderResult.getByText("#6")).toBeTruthy();
    expect(renderResult.getByText("-1.00")).toBeTruthy();

    // Trigger realtime update for a BRAND NEW trade cycle settling with WIN (should trigger playWin sound)
    await act(async () => {
      (supabase as any).triggerTradeUpdate({
        new: {
          id: "t-new-win",
          cycle_number: 8,
          intent: { action: "long", asset: "MNT" },
          result: "win",
          pnl_mnt: 0.5,
          self_corrected: false,
          tx_hash: "0xtxnewwin",
          created_at: "2026-05-30T10:45:00Z",
        },
      });
    });

    expect(playWin).toHaveBeenCalled();
    expect(renderResult.getByText("#8")).toBeTruthy();
    expect(renderResult.getByText("+0.50")).toBeTruthy();
  });

  it("handles null data from supabase gracefully", async () => {
    (global as any).mockTradesData = null;
    (global as any).mockCorrectionsData = null;
    let renderResult: any;
    await act(async () => {
      renderResult = render(<TradeHistory />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(renderResult.getByText("No completed trades yet")).toBeTruthy();
  });
});
