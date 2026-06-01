import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpectatorChat } from "./SpectatorChat";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { supabase } from "@/lib/supabase";

vi.mock("@/hooks/useActiveCycle", () => ({
  useActiveCycle: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  let changeCallback: any;
  const mockChannel = {
    on: vi.fn().mockImplementation((event, filter, callback) => {
      changeCallback = callback;
      return mockChannel;
    }),
    subscribe: vi.fn().mockReturnThis(),
  };

  const builder: any = {
    from: vi.fn().mockImplementation(() => builder),
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockImplementation(() => builder),
    then: vi.fn().mockImplementation((onfulfilled) => {
      return Promise.resolve({ data: (global as any).mockChatData }).then(onfulfilled);
    }),
  };

  return {
    supabase: {
      ...builder,
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      triggerInsert: (payload: any) => changeCallback(payload),
    },
  };
});

describe("SpectatorChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).mockChatData = [];
  });

  it("renders empty state when cycle is null", () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByText } = render(<SpectatorChat />);
    expect(getByText("LIVE ARENA CHAT")).toBeTruthy();
    expect(getByText("CROWD SENTIMENT")).toBeTruthy();
  });

  it("renders fetched messages and handles realtime inserts with sentiment transitions", async () => {
    vi.mocked(useActiveCycle).mockReturnValue({ id: "cycle-99" } as any);
    
    (global as any).mockChatData = [
      {
        id: "m1",
        cycle_id: "cycle-99",
        username: "bull_whale",
        message: "easy win long!",
        sentiment: "BULLISH",
        created_at: "2026-05-30T10:00:00Z",
      },
      {
        id: "m2",
        cycle_id: "cycle-99",
        username: "bear_trap",
        message: "it will crash",
        sentiment: "BEARISH",
        created_at: "2026-05-30T10:01:00Z",
      },
      {
        id: "", // falsy id test to trigger created_at key fallback
        cycle_id: "cycle-99",
        username: "troller",
        message: "kekw",
        sentiment: "TROLL",
        created_at: "2026-05-30T10:02:00Z",
      },
      {
        id: "m4",
        cycle_id: "cycle-99",
        username: "neutral",
        message: "just watching",
        sentiment: "NEUTRAL",
        created_at: "2026-05-30T10:03:00Z",
      },
    ];

    let renderResult: any;
    await act(async () => {
      renderResult = render(<SpectatorChat />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Check rendering and emojis
    expect(renderResult.getByText("🚀")).toBeTruthy();
    expect(renderResult.getByText("bull_whale")).toBeTruthy();
    expect(renderResult.getByText("easy win long!")).toBeTruthy();

    expect(renderResult.getByText("🐻")).toBeTruthy();
    expect(renderResult.getByText("bear_trap")).toBeTruthy();
    expect(renderResult.getByText("it will crash")).toBeTruthy();

    expect(renderResult.getByText("🤡")).toBeTruthy();
    expect(renderResult.getByText("troller")).toBeTruthy();

    expect(renderResult.getByText("👀")).toBeTruthy();
    expect(renderResult.getByText("neutral")).toBeTruthy();

    // Trigger realtime insert with BULLISH sentiment (meter should increase)
    await act(async () => {
      (supabase as any).triggerInsert({
        new: {
          id: "m5",
          cycle_id: "cycle-99",
          username: "bull_rider",
          message: "go up!",
          sentiment: "BULLISH",
          created_at: "2026-05-30T10:04:00Z",
        },
      });
    });

    expect(renderResult.getByText("bull_rider")).toBeTruthy();
    expect(renderResult.getByText("go up!")).toBeTruthy();

    // Trigger realtime insert with BEARISH sentiment (meter should decrease)
    await act(async () => {
      (supabase as any).triggerInsert({
        new: {
          id: "m6",
          cycle_id: "cycle-99",
          username: "bear_hunter",
          message: "dumping",
          sentiment: "BEARISH",
          created_at: "2026-05-30T10:05:00Z",
        },
      });
    });

    expect(renderResult.getByText("bear_hunter")).toBeTruthy();
  });

  it("handles null data from supabase gracefully", async () => {
    vi.mocked(useActiveCycle).mockReturnValue({ id: "cycle-99" } as any);
    (global as any).mockChatData = null;
    let renderResult: any;
    await act(async () => {
      renderResult = render(<SpectatorChat />);
    });
    expect(renderResult.getByText("LIVE ARENA CHAT")).toBeTruthy();
    expect(renderResult.queryByText("🚀")).toBeNull();
  });
});
