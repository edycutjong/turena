import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTradeCycle } from "./useTradeCycle";
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
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: [] });
      }),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    },
  };
});

describe("useTradeCycle hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches initial state on mount and sets active cycle if there is a pending one", async () => {
    const mockCycles = [
      { id: "1", result: "pending", cycle_number: 10 },
      { id: "2", result: "win", cycle_number: 9 },
    ];
    vi.mocked((supabase as any).limit).mockImplementationOnce(() => {
      return Promise.resolve({ data: mockCycles }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useTradeCycle());
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current.cycles.length).toBe(2);
    expect(hookResult.current.activeCycle?.id).toBe("1");
  });

  it("sets active cycle to null if no pending trade cycles are fetched", async () => {
    const mockCycles = [
      { id: "2", result: "win", cycle_number: 9 },
    ];
    vi.mocked((supabase as any).limit).mockImplementationOnce(() => {
      return Promise.resolve({ data: mockCycles }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useTradeCycle());
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current.cycles.length).toBe(1);
    expect(hookResult.current.activeCycle).toBeNull();
  });

  it("handles INSERT postgres changes for pending and non-pending cycles", async () => {
    let changeCallback: any;
    const mockChannel = {
      on: vi.fn().mockImplementation((event, filter, callback) => {
        changeCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
    vi.mocked((supabase as any).limit).mockImplementationOnce(() => {
      return Promise.resolve({ data: [] }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useTradeCycle());
      hookResult = result;
    });

    // Insert pending cycle
    await act(async () => {
      changeCallback({
        eventType: "INSERT",
        new: { id: "10", result: "pending", cycle_number: 10 },
      });
    });

    expect(hookResult.current.cycles.length).toBe(1);
    expect(hookResult.current.activeCycle?.id).toBe("10");

    // Insert non-pending cycle
    await act(async () => {
      changeCallback({
        eventType: "INSERT",
        new: { id: "11", result: "win", cycle_number: 11 },
      });
    });

    expect(hookResult.current.cycles.length).toBe(2);
    // Active cycle remains the pending one (id: 10)
    expect(hookResult.current.activeCycle?.id).toBe("10");
  });

  it("handles UPDATE postgres changes", async () => {
    let changeCallback: any;
    const mockChannel = {
      on: vi.fn().mockImplementation((event, filter, callback) => {
        changeCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const initialCycles = [
      { id: "10", result: "pending", cycle_number: 10 },
    ];
    vi.mocked((supabase as any).limit).mockImplementationOnce(() => {
      return Promise.resolve({ data: initialCycles }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useTradeCycle());
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current.activeCycle?.id).toBe("10");

    // Update pending cycle to be winning (no longer pending)
    await act(async () => {
      changeCallback({
        eventType: "UPDATE",
        new: { id: "10", result: "win", cycle_number: 10 },
      });
    });

    expect(hookResult.current.cycles[0].result).toBe("win");
    expect(hookResult.current.activeCycle).toBeNull();

    // Trigger a DELETE event (should do nothing)
    await act(async () => {
      changeCallback({
        eventType: "DELETE",
        old: { id: "10" },
      });
    });

    // Update a cycle from winning back to pending (e.g. testing the fallback route)
    await act(async () => {
      changeCallback({
        eventType: "UPDATE",
        new: { id: "10", result: "pending", cycle_number: 10 },
      });
    });

    expect(hookResult.current.activeCycle?.id).toBe("10");
  });

  it("handles null data on initial fetch", async () => {
    vi.mocked((supabase as any).limit).mockImplementationOnce(() => {
      return Promise.resolve({ data: null }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useTradeCycle());
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current.cycles).toEqual([]);
    expect(hookResult.current.activeCycle).toBeNull();
  });

  it("handles UPDATE event when activeCycle matches the updated cycle ID and is still pending", async () => {
    let changeCallback: any;
    const mockChannel = {
      on: vi.fn().mockImplementation((event, filter, callback) => {
        changeCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const initialCycles = [
      { id: "10", result: "pending", cycle_number: 10, pnl_mnt: null },
    ];
    vi.mocked((supabase as any).limit).mockImplementationOnce(() => {
      return Promise.resolve({ data: initialCycles }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useTradeCycle());
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current.activeCycle?.id).toBe("10");

    // Update the pending cycle while keeping it pending (e.g. updating pnl or self_corrected)
    await act(async () => {
      changeCallback({
        eventType: "UPDATE",
        new: { id: "10", result: "pending", cycle_number: 10, pnl_mnt: 5 },
      });
    });

    expect(hookResult.current.activeCycle?.pnl_mnt).toBe(5);
  });

  it("handles UPDATE event when activeCycle does not match the updated cycle ID and the updated cycle is pending", async () => {
    let changeCallback: any;
    const mockChannel = {
      on: vi.fn().mockImplementation((event, filter, callback) => {
        changeCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    // Initial state: active cycle is id "9" (pending), and cycle "10" is "win"
    const initialCycles = [
      { id: "10", result: "win", cycle_number: 10 },
      { id: "9", result: "pending", cycle_number: 9 },
    ];
    vi.mocked((supabase as any).limit).mockImplementationOnce(() => {
      return Promise.resolve({ data: initialCycles }) as any;
    });

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useTradeCycle());
      hookResult = result;
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(hookResult.current.activeCycle?.id).toBe("9");

    // Update cycle "10" to be pending. Since activeCycle is id "9", this does not match "10".
    // It should change activeCycle to the updated cycle "10" (which is pending).
    await act(async () => {
      changeCallback({
        eventType: "UPDATE",
        new: { id: "10", result: "pending", cycle_number: 10 },
      });
    });

    expect(hookResult.current.activeCycle?.id).toBe("10");
  });
});
