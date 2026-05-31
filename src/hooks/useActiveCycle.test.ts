import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useActiveCycle } from "./useActiveCycle";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe("useActiveCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads latest pending cycle on mount and subscribes", async () => {
    const mockCycle = { id: 1, result: "pending" };
    
    const mockSingle = vi.fn().mockResolvedValue({ data: mockCycle });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    let insertCallback: any;
    let updateCallback: any;

    const mockSubscribe = vi.fn();
    const mockOnUpdate = vi.fn().mockImplementation((event, filter, cb) => {
      updateCallback = cb;
      return { subscribe: mockSubscribe };
    });
    const mockOnInsert = vi.fn().mockImplementation((event, filter, cb) => {
      insertCallback = cb;
      return { on: mockOnUpdate };
    });
    
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOnInsert } as any);

    const { result, unmount } = renderHook(() => useActiveCycle());

    // Verify initial load
    expect(supabase.from).toHaveBeenCalledWith("trade_cycles");
    await waitFor(() => {
      expect(result.current).toEqual(mockCycle);
    });

    // Verify subscription
    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining("active-cycle"));
    expect(mockSubscribe).toHaveBeenCalled();

    // Trigger insert
    const newCycle = { id: 2, result: "pending" };
    insertCallback({ new: newCycle });
    await waitFor(() => {
      expect(result.current).toEqual(newCycle);
    });

    // Trigger update
    const updatedCycle = { id: 2, result: "resolved" };
    updateCallback({ new: updatedCycle });
    await waitFor(() => {
      expect(result.current).toEqual(updatedCycle);
    });

    // Unmount
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("handles null data on mount and unmatched update payload id", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    let updateCallback: any;

    const mockSubscribe = vi.fn();
    const mockOnUpdate = vi.fn().mockImplementation((event, filter, cb) => {
      updateCallback = cb;
      return { subscribe: mockSubscribe };
    });
    const mockOnInsert = vi.fn().mockImplementation((event, filter, cb) => {
      return { on: mockOnUpdate };
    });
    
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOnInsert } as any);

    const { result } = renderHook(() => useActiveCycle());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // Trigger update with unmatched id
    const updatedCycle = { id: 99, result: "resolved" };
    updateCallback({ new: updatedCycle });
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});
