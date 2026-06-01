import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";
import { useTradeCycle } from "../lib/hooks/useTradeCycle";

vi.mock("../lib/hooks/useTradeCycle", () => ({
  useTradeCycle: vi.fn(),
}));

vi.mock("./CoTTerminal", () => ({
  default: ({ cycleId }: any) => <div data-testid="cot">{cycleId}</div>,
}));

vi.mock("./CounterTradeWindow", () => ({
  default: ({ activeCycle }: any) => <div data-testid="window">{activeCycle ? activeCycle.id : "empty"}</div>,
}));

describe("DashboardLayout", () => {
  it("renders empty state", () => {
    vi.mocked(useTradeCycle).mockReturnValue({
      activeCycle: null,
      cycles: [],
    });

    const { getByText } = render(<DashboardLayout />);
    expect(getByText("No recent trades")).toBeTruthy();
    expect(getByText("0.0%")).toBeTruthy();
  });

  it("renders with cycles data and active cycle", () => {
    const mockCycles = [
      {
        id: "c-active",
        agent_id: "agent-0",
        cycle_number: 10,
        intent: { action: "long", asset: "MNT" },
        cot_transcript: null,
        result: "pending" as const,
        pnl_mnt: null,
        self_corrected: false,
        tx_hash: null,
        created_at: "",
      },
      {
        id: "c-win",
        agent_id: "agent-0",
        cycle_number: 9,
        intent: JSON.stringify({ action: "short", asset: "MNT" }) as any, // stringified intent test
        cot_transcript: null,
        result: "win" as const,
        pnl_mnt: 10.5,
        self_corrected: false,
        tx_hash: null,
        created_at: "",
      },
      {
        id: "c-win-2",
        agent_id: "agent-0",
        cycle_number: 7,
        intent: { action: "long", asset: "MNT" }, // parsed object intent test
        cot_transcript: null,
        result: "win" as const,
        pnl_mnt: null, // null pnl test (should show WIN fallback)
        self_corrected: false,
        tx_hash: null,
        created_at: "",
      },
      {
        id: "c-loss",
        agent_id: "agent-0",
        cycle_number: 8,
        intent: null, // empty intent test
        cot_transcript: null,
        result: "loss" as const,
        pnl_mnt: -5.0,
        self_corrected: false,
        tx_hash: null,
        created_at: "",
      },
    ];

    vi.mocked(useTradeCycle).mockReturnValue({
      activeCycle: mockCycles[0],
      cycles: mockCycles,
    });

    const { container, getByText, getByTestId } = render(<DashboardLayout />);

    // Active cycle is passed to terminal & window
    expect(getByTestId("cot").textContent).toBe("c-active");
    expect(getByTestId("window").textContent).toBe("c-active");

    // Settled cycles statistics: 3 total trades, 2 win, win rate = 66.7%
    expect(getByText("66.7%")).toBeTruthy();

    // Table rows rendering
    expect(getByText("#9")).toBeTruthy();
    expect(container.textContent).toContain("SHORT MNT");
    expect(getByText("+10.50")).toBeTruthy();

    expect(getByText("#8")).toBeTruthy();
    expect(container.textContent).toContain("UNKNOWN MNTUSDT");
    expect(getByText("-5.00")).toBeTruthy();

    expect(getByText("#7")).toBeTruthy();
    expect(container.textContent).toContain("LONG MNT");
    expect(getByText("WIN")).toBeTruthy();
  });
});
