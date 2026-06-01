import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import ReplayPage from "./page";
import { supabase } from "@/lib/supabase";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/supabase", () => {
  function createMockBuilder(table = "") {
    const builder: any = {
      from: vi.fn().mockImplementation((t) => createMockBuilder(t)),
      select: vi.fn().mockImplementation(() => builder),
      neq: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
      then: vi.fn().mockImplementation((onfulfilled) => {
        const data = table === "trade_cycles" ? (global as any).mockCyclesData : (global as any).mockTokensData;
        return Promise.resolve({ data }).then(onfulfilled);
      }),
    };
    return builder;
  }

  const mockQueryBuilder = createMockBuilder();
  return {
    supabase: mockQueryBuilder,
  };
});

vi.mock("@/components/AppNav", () => ({
  AppNav: ({ right }: any) => <div data-testid="appnav">{right}</div>,
}));

describe("ReplayPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).mockCyclesData = [];
    (global as any).mockTokensData = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with initial empty cycle list", async () => {
    (global as any).mockCyclesData = [];

    let renderResult: any;
    await act(async () => {
      renderResult = render(<ReplayPage />);
    });

    expect(renderResult.getByText("Click a cycle to replay its reasoning")).toBeTruthy();
  });

  it("renders fetched cycle list and triggers loading of replay on click", async () => {
    const mockCycles = [
      { id: "cycle-1", cycle_number: 1, result: "win", self_corrected: true, intent: { action: "long", asset: "MNT" } },
      { id: "cycle-2", cycle_number: 2, result: "loss", self_corrected: false, intent: { action: "short", asset: "MNT" } },
    ];
    (global as any).mockCyclesData = mockCycles;

    const mockTokens = [
      { id: 10, token_type: "reasoning", token_text: "Reasoning step 1 " },
      { id: 11, token_type: "intent", token_text: "Final Intent " },
      { id: 12, token_type: "correction", token_text: "Self Correction " },
    ];
    (global as any).mockTokensData = mockTokens;

    let renderResult: any;
    await act(async () => {
      renderResult = render(<ReplayPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const cycleButton1 = renderResult.getByText("#1");
    expect(cycleButton1).toBeTruthy();

    await act(async () => {
      fireEvent.click(cycleButton1);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(renderResult.getByText("Reasoning step 1")).toBeTruthy();
    expect(renderResult.getByText("Final Intent")).toBeTruthy();
    expect(renderResult.getByText("Self Correction")).toBeTruthy();
  });

  it("handles null data from supabase gracefully", async () => {
    // 1. Initial list fetch returns null data
    (global as any).mockCyclesData = null;

    let renderResult: any;
    await act(async () => {
      renderResult = render(<ReplayPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Cycle list should be empty
    expect(renderResult.queryByText("#1")).toBeNull();

    // 2. Mock cycles exist, but replaying one returns null tokens
    const mockCycles = [
      { id: "cycle-1", cycle_number: 1, result: "win", self_corrected: true, intent: { action: "long", asset: "MNT" } },
    ];
    (global as any).mockCyclesData = mockCycles;
    (global as any).mockTokensData = null;

    await act(async () => {
      renderResult = render(<ReplayPage />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const cycleButton1 = renderResult.getByText("#1");
    await act(async () => {
      fireEvent.click(cycleButton1);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Reasoning container should show loading text since tokens is empty array
    expect(renderResult.getByText("Cycle #1 — WIN")).toBeTruthy();
    expect(renderResult.getByText("Loading CoT transcript…")).toBeTruthy();
  });
});
