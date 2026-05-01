import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSelfCorrections } from "./useSelfCorrections";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe("useSelfCorrections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads recent corrections and subscribes", async () => {
    const mockData = [
      { id: 1, reason: "old" }
    ];
    
    const mockLimit = vi.fn().mockResolvedValue({ data: mockData });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    let insertCallback: any;
    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockImplementation((event, filter, cb) => {
      insertCallback = cb;
      return { subscribe: mockSubscribe };
    });
    
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);

    const { result, unmount } = renderHook(() => useSelfCorrections());

    expect(supabase.from).toHaveBeenCalledWith("self_corrections");
    
    await waitFor(() => {
      expect(result.current.corrections).toEqual(mockData);
    });
    expect(result.current.latest).toBeNull();

    const newCorrection = { id: 2, reason: "new" };
    insertCallback({ new: newCorrection });
    
    await waitFor(() => {
      expect(result.current.corrections).toEqual([newCorrection, ...mockData]);
    });
    expect(result.current.latest).toEqual(newCorrection);

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("handles null data on mount", async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockImplementation(() => ({ subscribe: mockSubscribe }));
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);

    const { result } = renderHook(() => useSelfCorrections());

    await waitFor(() => {
      expect(result.current.corrections).toEqual([]);
    });
  });
});
