import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCoTStream } from "./useCoTStream";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe("useCoTStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if cycleId is null", () => {
    const { result } = renderHook(() => useCoTStream(null));
    expect(result.current).toEqual([]);
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it("subscribes to cot tokens and updates state", async () => {
    let insertCallback: any;
    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockImplementation((event, filter, cb) => {
      insertCallback = cb;
      return { subscribe: mockSubscribe };
    });
    
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);

    const { result, unmount, rerender } = renderHook(({ id }) => useCoTStream(id), {
      initialProps: { id: "cycle-1" }
    });

    expect(result.current).toEqual([]);
    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining("cot-cycle-1"));
    expect(mockSubscribe).toHaveBeenCalled();

    const token1 = { id: 1, token: "hello" };
    insertCallback({ new: token1 });
    await waitFor(() => {
      expect(result.current).toEqual([token1]);
    });

    const token2 = { id: 2, token: " world" };
    insertCallback({ new: token2 });
    await waitFor(() => {
      expect(result.current).toEqual([token1, token2]);
    });
    
    // Test that re-rendering with same ID doesn't clear state, but changing ID does
    rerender({ id: "cycle-2" });
    
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
    
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining("cot-cycle-2"));

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
  });

  it("loads initial tokens from db and ignores duplicates", async () => {
    let insertCallback: any;
    const mockOn = vi.fn().mockImplementation((event, filter, cb) => {
      insertCallback = cb;
      return { subscribe: vi.fn() };
    });
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);
    
    // Mock the DB returning some initial tokens
    const initialData = [{ id: 100, token: "initial" }];
    (supabase as any).order.mockResolvedValueOnce({ data: initialData });

    const { result } = renderHook(() => useCoTStream("cycle-1"));
    
    await waitFor(() => {
      expect(result.current).toEqual(initialData);
    });

    // Fire a duplicate event (should be ignored)
    insertCallback({ new: { id: 100, token: "initial" } });
    
    // Fire a new, unique event
    const newToken = { id: 101, token: "new" };
    insertCallback({ new: newToken });

    await waitFor(() => {
      expect(result.current).toEqual([...initialData, newToken]);
    });
  });
});
