import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CorrectionTimeline } from "./CorrectionTimeline";
import { supabase } from "@/lib/supabase";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
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
    order: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockImplementation(() => builder),
    then: vi.fn().mockImplementation((onfulfilled) => {
      return Promise.resolve({ data: (global as any).mockCorrectionsData }).then(onfulfilled);
    }),
  };

  return {
    supabase: {
      ...builder,
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      triggerRealtimeInsert: (payload: any) => changeCallback(payload),
    },
  };
});

describe("CorrectionTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).mockCorrectionsData = [];
  });

  it("renders empty state when corrections list is empty", async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(<CorrectionTimeline />);
    });
    expect(renderResult.getByText("No corrections yet — agent is learning.")).toBeTruthy();
  });

  it("renders loaded corrections and handles realtime updates", async () => {
    (global as any).mockCorrectionsData = [
      {
        id: "c1",
        parameter_changed: "tolerance",
        old_value: "0.5",
        new_value: "0.3", // delta < 0, tolerance -> improved: true
        regret_score: 80,
        created_at: "2026-05-30T10:00:00Z",
        tx_hash: "0x1234567890abcdef",
      },
      {
        id: "c2",
        parameter_changed: "alpha",
        old_value: "1.0",
        new_value: "1.2", // delta > 0 -> improved: true
        regret_score: 30,
        created_at: "2026-05-30T09:00:00Z",
        tx_hash: null,
      },
      {
        id: "c4",
        parameter_changed: "alpha",
        old_value: "0.5",
        new_value: "0.2", // delta < 0, alpha -> improved: false
        regret_score: 40,
        created_at: "2026-05-30T08:00:00Z",
        tx_hash: null,
      },
    ];

    let renderResult: any;
    await act(async () => {
      renderResult = render(<CorrectionTimeline />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(renderResult.getByText("⚡ tolerance")).toBeTruthy();
    expect(renderResult.container.textContent).toContain("Regret: 80");
    expect(renderResult.getAllByText("⚡ alpha").length).toBe(2);
    expect(renderResult.queryByText("0x1234567890abcdef")).toBeNull(); // it slices to 10 chars -> 0x12345678…
    expect(renderResult.getByText("↗ 0x12345678…")).toBeTruthy();

    // Trigger realtime insert
    await act(async () => {
      (supabase as any).triggerRealtimeInsert({
        new: {
          id: "c3",
          parameter_changed: "threshold",
          old_value: "0.2",
          new_value: "0.4", // delta > 0, threshold -> improved: false
          regret_score: 55,
          created_at: "2026-05-30T11:00:00Z",
          tx_hash: null,
        },
      });
    });

    expect(renderResult.getByText("⚡ threshold")).toBeTruthy();
    expect(renderResult.container.textContent).toContain("Regret: 55");
  });

  it("handles null data from supabase gracefully", async () => {
    (global as any).mockCorrectionsData = null;
    let renderResult: any;
    await act(async () => {
      renderResult = render(<CorrectionTimeline />);
    });
    expect(renderResult.getByText("No corrections yet — agent is learning.")).toBeTruthy();
  });
});
