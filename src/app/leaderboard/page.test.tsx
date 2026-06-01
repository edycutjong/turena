import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import LeaderboardPage from "./page";
import { supabase } from "@/lib/supabase";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  animate: (from: number, to: number, options: any) => {
    options.onUpdate?.(to);
    return { stop: () => {} };
  },
}));

vi.mock("@/lib/supabase", () => {
  function createMockBuilder(table = "") {
    const builder: any = {
      from: vi.fn().mockImplementation((t) => createMockBuilder(t)),
      select: vi.fn().mockImplementation(() => builder),
      neq: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: (global as any).mockAgentData });
      }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        const data = table === "counter_trades" ? (global as any).mockTradesData : (global as any).mockAgentData;
        return Promise.resolve({ data }).then(onfulfilled);
      }),
    };
    return builder;
  }

  const mockQueryBuilder = createMockBuilder();
  return {
    supabase: mockQueryBuilder,
  };
});

vi.mock("@/components/AppNav", () => ({
  AppNav: ({ right }: any) => <div data-testid="appnav">{right}</div>,
}));

vi.mock("@/components/CorrectionTimeline", () => ({
  CorrectionTimeline: () => <div data-testid="timeline">CorrectionTimeline</div>,
}));

describe("LeaderboardPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with initial loading and then shows empty list if no traders", async () => {
    (global as any).mockAgentData = {
      total_trades: 10,
      win_rate: 0.6,
      elo_rating: 1200,
      self_corrections_count: 3,
      total_pnl: 15.5,
    };
    (global as any).mockTradesData = [];

    let renderResult: any;
    await act(async () => {
      renderResult = render(<LeaderboardPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(renderResult.getByText("No counter-trades yet — be the first!")).toBeTruthy();
    expect(renderResult.getByText("wins · 60.0%")).toBeTruthy();
    expect(renderResult.getByText("wins · 40.0%")).toBeTruthy(); // human win rate
    expect(renderResult.getByText("ELO 1200")).toBeTruthy();
    expect(renderResult.getByText("+15.50 MNT")).toBeTruthy();
  });

  it("calculates and displays sorted stats for traders when data is returned", async () => {
    (global as any).mockAgentData = {
      total_trades: 20,
      win_rate: null, // should fall back to 0
      elo_rating: 1000,
      self_corrections_count: 5,
      total_pnl: -2.5,
    };

    const mockTrades = [
      { wallet_address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", amount_mnt: 15, payout_mnt: 20, result: "win" },
      { wallet_address: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", amount_mnt: 10, payout_mnt: 30, result: "win" },
      { wallet_address: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC", amount_mnt: 1, payout_mnt: undefined, result: "loss" }, // payout undefined -> fallback to 0
      { wallet_address: "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD", amount_mnt: 2, payout_mnt: 0, result: "loss" },
    ];
    (global as any).mockTradesData = mockTrades;

    let renderResult: any;
    await act(async () => {
      renderResult = render(<LeaderboardPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // 0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB P&L: 30 - 10 = +20 (Rank 1 -> 🥇)
    // 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA P&L: 20 - 15 = +5 (Rank 2 -> 🥈)
    // 0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC P&L: 0 - 1 = -1 (Rank 3 -> 🥉)
    // 0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD P&L: 0 - 2 = -2 (Rank 4 -> #4)

    expect(renderResult.getByText("0xBBBB…BBBB")).toBeTruthy();
    expect(renderResult.getByText("🥇")).toBeTruthy();
    expect(renderResult.getByText("+20.00")).toBeTruthy();

    expect(renderResult.getByText("0xAAAA…AAAA")).toBeTruthy();
    expect(renderResult.getByText("🥈")).toBeTruthy();
    expect(renderResult.getByText("+5.00")).toBeTruthy();

    expect(renderResult.getByText("0xCCCC…CCCC")).toBeTruthy();
    expect(renderResult.getByText("🥉")).toBeTruthy();
    expect(renderResult.getByText("-1.00")).toBeTruthy();

    expect(renderResult.getByText("0xDDDD…DDDD")).toBeTruthy();
    expect(renderResult.getByText("#4")).toBeTruthy();
    expect(renderResult.getByText("-2.00")).toBeTruthy();

    // Verify win statistics (agentWins should be 0 because win_rate is null)
    expect(renderResult.getByText("wins · 0.0%")).toBeTruthy();
  });

  it("handles null agent and null trades data gracefully", async () => {
    (global as any).mockAgentData = null;
    (global as any).mockTradesData = null;

    let renderResult: any;
    await act(async () => {
      renderResult = render(<LeaderboardPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(renderResult.getByText("No counter-trades yet — be the first!")).toBeTruthy();
  });
});
