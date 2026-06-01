import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CounterTradeWindow from "./CounterTradeWindow";

describe("CounterTradeWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders awaiting state when activeCycle is null", () => {
    const { getByText } = render(<CounterTradeWindow activeCycle={null} />);
    expect(getByText("Awaiting Next Cycle")).toBeTruthy();
  });

  it("renders loading state when activeCycle has no intent", () => {
    const mockCycle = {
      id: "cycle-1",
      agent_id: "agent-0",
      cycle_number: 1,
      intent: null,
      cot_transcript: null,
      result: "pending" as const,
      pnl_mnt: null,
      self_corrected: false,
      tx_hash: null,
      created_at: "",
    };

    const { getByText } = render(<CounterTradeWindow activeCycle={mockCycle} />);
    expect(getByText("Agent is reasoning...")).toBeTruthy();
  });

  it("renders trade layout when activeCycle has intent and triggers countdown and bet submission", () => {
    const mockCycle = {
      id: "cycle-1",
      agent_id: "agent-0",
      cycle_number: 1,
      intent: { action: "short", asset: "MNT", confidence: 0.85 },
      cot_transcript: null,
      result: "pending" as const,
      pnl_mnt: null,
      self_corrected: false,
      tx_hash: null,
      created_at: "",
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { getByText, rerender } = render(<CounterTradeWindow activeCycle={mockCycle} />);
    expect(getByText("SHORT")).toBeTruthy();
    expect(getByText("MNT")).toBeTruthy();
    expect(getByText("Confidence: 85.0%")).toBeTruthy();
    expect(getByText("00:15")).toBeTruthy();

    const actionBtn = getByText("Bet Against AI");
    expect(actionBtn).toBeTruthy();

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getByText("00:10")).toBeTruthy();

    // Click Bet
    fireEvent.click(actionBtn);
    expect(logSpy).toHaveBeenCalledWith("Bet placed on cycle", "cycle-1");
    expect(getByText("Trade Placed")).toBeTruthy();
    expect(actionBtn).toBeDisabled();

    logSpy.mockRestore();
  });

  it("handles stringified intent parsing and timer expiration", () => {
    const mockCycle = {
      id: "cycle-2",
      agent_id: "agent-0",
      cycle_number: 2,
      intent: JSON.stringify({ action: "long", asset: "BTC", confidence: 0.99 }) as any,
      cot_transcript: null,
      result: "pending" as const,
      pnl_mnt: null,
      self_corrected: false,
      tx_hash: null,
      created_at: "",
    };

    const { getByText } = render(<CounterTradeWindow activeCycle={mockCycle} />);
    expect(getByText("LONG")).toBeTruthy();
    expect(getByText("BTC")).toBeTruthy();
    expect(getByText("Confidence: 99.0%")).toBeTruthy();
    expect(getByText("00:15")).toBeTruthy();

    // Advance 15 seconds to expire timer
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(getByText("00:00")).toBeTruthy();
    expect(getByText("Window Closed")).toBeTruthy();
  });
});
