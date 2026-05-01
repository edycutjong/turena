import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCounterTrades } from "./useCounterTrades";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe("useCounterTrades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if cycleId is null", () => {
    const { result } = renderHook(() => useCounterTrades(null));
    expect(result.current).toEqual({ trades: [], totalPool: 0, againstPool: 0 });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it("loads trades and subscribes to new ones, calculating pools", async () => {
    const mockTrades = [
      { id: 1, amount_mnt: 100, position: "for" },
      { id: 2, amount_mnt: 50, position: "against" }
    ];
    
    const mockEq = vi.fn().mockResolvedValue({ data: mockTrades });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    let insertCallback: any;
    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockImplementation((event, filter, cb) => {
      insertCallback = cb;
      return { subscribe: mockSubscribe };
    });
    
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);

    const { result, unmount } = renderHook(() => useCounterTrades("cycle-1"));

    expect(supabase.from).toHaveBeenCalledWith("counter_trades");
    
    await waitFor(() => {
      expect(result.current.trades).toEqual(mockTrades);
    });
    
    expect(result.current.totalPool).toBe(150);
    expect(result.current.againstPool).toBe(50);

    const newTrade = { id: 3, amount_mnt: 25, position: "against" };
    insertCallback({ new: newTrade });
    
    await waitFor(() => {
      expect(result.current.trades).toEqual([...mockTrades, newTrade]);
    });
    
    expect(result.current.totalPool).toBe(175);
    expect(result.current.againstPool).toBe(75);

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("handles null data on mount", async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockImplementation(() => ({ subscribe: mockSubscribe }));
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);

    const { result } = renderHook(() => useCounterTrades("cycle-2"));

    await waitFor(() => {
      expect(result.current.trades).toEqual([]);
    });
  });
});
