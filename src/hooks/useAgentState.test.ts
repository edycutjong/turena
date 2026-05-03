import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAgentState } from "./useAgentState";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe("useAgentState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads agent state and subscribes to updates", async () => {
    const mockState = { agent_id: "agent-1", name: "Agent 1" };
    
    const mockSingle = vi.fn().mockResolvedValue({ data: mockState });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    let updateCallback: any;

    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockImplementation((event, filter, cb) => {
      updateCallback = cb;
      return { subscribe: mockSubscribe };
    });
    
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);

    const { result, unmount } = renderHook(() => useAgentState("agent-1"));

    expect(supabase.from).toHaveBeenCalledWith("agent_state");
    await waitFor(() => {
      expect(result.current).toEqual(mockState);
    });

    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining("agent-state-agent-1"));
    expect(mockSubscribe).toHaveBeenCalled();

    const updatedState = { agent_id: "agent-1", name: "Agent 1 Updated" };
    updateCallback({ new: updatedState });
    await waitFor(() => {
      expect(result.current).toEqual(updatedState);
    });

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("handles null data on mount", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockImplementation(() => ({ subscribe: mockSubscribe }));
    vi.mocked(supabase.channel).mockReturnValue({ on: mockOn } as any);

    const { result } = renderHook(() => useAgentState("agent-1"));

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});
