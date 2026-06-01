import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeCoT } from "./useRealtimeCoT";
import { supabase } from "../supabase/client";

// Mock Supabase client
vi.mock("../supabase/client", () => {
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

describe("useRealtimeCoT hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial empty state when activeCycleId is null", () => {
    const { result } = renderHook(() => useRealtimeCoT(null));
    expect(result.current).toEqual([]);
  });

  it("loads and subscribes to cot tokens when activeCycleId is provided", async () => {
    const mockData = [
      { id: 1, cycle_id: "cycle-1", token_text: "think 1", token_type: "reasoning" },
      { id: 2, cycle_id: "cycle-1", token_text: "think 2", token_type: "reasoning" },
    ];

    vi.mocked((supabase as any).order).mockImplementationOnce(() => {
      return Promise.resolve({ data: mockData }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useRealtimeCoT("cycle-1"));
      hookResult = result;
    });

    // Wait a tick for promise resolving state update
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(supabase.from).toHaveBeenCalledWith("cot_tokens");
    expect(supabase.channel).toHaveBeenCalledWith("cot_tokens_cycle-1");

    expect(hookResult.current.length).toBe(2);
    expect(hookResult.current[0].token_text).toBe("think 1");
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
      const { result } = renderHook(() => useRealtimeCoT("cycle-1"));
      hookResult = result;
    });

    // Trigger realtime insert
    await act(async () => {
      changeCallback({
        new: { id: 3, cycle_id: "cycle-1", token_text: "new token", token_type: "intent" },
      });
    });

    expect(hookResult.current.length).toBe(1);
    expect(hookResult.current[0].token_text).toBe("new token");
  });

  it("handles null data returned from supabase", async () => {
    vi.mocked((supabase as any).order).mockImplementationOnce(() => {
      return Promise.resolve({ data: null }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useRealtimeCoT("cycle-1"));
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current).toEqual([]);
  });
});
