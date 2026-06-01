import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSabotageEvents } from "./useSabotageEvents";
import { supabase } from "@/lib/supabase";

// Mock Supabase client
vi.mock("@/lib/supabase", () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: [] });
      }),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    },
  };
});

describe("useSabotageEvents hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial empty state when cycleId is null", () => {
    const { result } = renderHook(() => useSabotageEvents(null));
    expect(result.current.events).toEqual([]);
    expect(result.current.totalMnt).toBe(0);
    expect(result.current.byCard).toEqual({});
  });

  it("loads and subscribes to events when cycleId is provided", async () => {
    const mockData = [
      { id: 1, cycle_id: "cycle-1", card_type: "FUD", mnt_paid: 10 },
      { id: 2, cycle_id: "cycle-1", card_type: "FUD", mnt_paid: 15 },
      { id: 3, cycle_id: "cycle-1", card_type: "FOMO", mnt_paid: 20 },
      { id: 4, cycle_id: "cycle-2", card_type: "FUD", mnt_paid: 5 }, // should be filtered out
    ];

    vi.mocked((supabase as any).order).mockImplementationOnce(() => {
      return Promise.resolve({ data: mockData }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useSabotageEvents("cycle-1"));
      hookResult = result;
    });

    // Wait a tick for promise resolving state update
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(supabase.from).toHaveBeenCalledWith("sabotage_events");
    expect(supabase.channel).toHaveBeenCalled();

    // Verify filter works
    expect(hookResult.current.events.length).toBe(3);
    expect(hookResult.current.totalMnt).toBe(45);
    expect(hookResult.current.byCard).toEqual({
      FUD: { count: 2, totalMnt: 25 },
      FOMO: { count: 1, totalMnt: 20 },
    });
  });

  it("handles new inserts from realtime subscription channel", async () => {
    let changeCallback: any;

    const mockChannel = {
      on: vi.fn().mockImplementation((event, filter, callback) => {
        changeCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn().mockReturnThis(),
    };

    vi.mocked(supabase.channel).mockReturnValueOnce(mockChannel as any);
    vi.mocked((supabase as any).order).mockImplementationOnce(() => {
      return Promise.resolve({ data: [] }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useSabotageEvents("cycle-1"));
      hookResult = result;
    });

    // Trigger realtime insert
    await act(async () => {
      changeCallback({
        new: { id: 10, cycle_id: "cycle-1", card_type: "FUD", mnt_paid: 30 },
      });
    });

    expect(hookResult.current.events.length).toBe(1);
    expect(hookResult.current.totalMnt).toBe(30);
    expect(hookResult.current.byCard.FUD).toEqual({ count: 1, totalMnt: 30 });
  });

  it("handles null data returned from supabase", async () => {
    vi.mocked((supabase as any).order).mockImplementationOnce(() => {
      return Promise.resolve({ data: null }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useSabotageEvents("cycle-1"));
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current.events).toEqual([]);
  });
});
