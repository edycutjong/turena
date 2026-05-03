import { render, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CountdownTimer } from "./CountdownTimer";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    span: ({ children, className }: any) => <span className={className}>{children}</span>,
    circle: ({ className, stroke, strokeDasharray }: any) => <circle className={className} stroke={stroke} strokeDasharray={strokeDasharray} />
  }
}));

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders with initial duration when not started", () => {
    const { getByText } = render(<CountdownTimer durationSeconds={60} startedAt={null} />);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getByText("60")).toBeInTheDocument();
    expect(getByText("waiting")).toBeInTheDocument();
  });

  it("counts down when startedAt is provided", () => {
    const startedAt = new Date(Date.now() - 10000); // 10 seconds ago
    const { getByText } = render(<CountdownTimer durationSeconds={60} startedAt={startedAt} />);
    
    // Initial render effect should set it to 50
    expect(getByText("50")).toBeInTheDocument();
    expect(getByText("counter window open")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000); // advance 5 seconds
    });

    expect(getByText("45")).toBeInTheDocument();
  });

  it("triggers onExpire when time runs out", () => {
    const onExpire = vi.fn();
    const startedAt = new Date();
    
    render(<CountdownTimer durationSeconds={10} startedAt={startedAt} onExpire={onExpire} />);
    
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("displays window closed message when expired", () => {
    const startedAt = new Date(Date.now() - 15000); // 15 seconds ago
    const { getByText } = render(<CountdownTimer durationSeconds={10} startedAt={startedAt} />);
    
    expect(getByText("0")).toBeInTheDocument();
    expect(getByText("window closed")).toBeInTheDocument();
  });

  it("displays phase label when phase is provided", () => {
    const { getByText } = render(<CountdownTimer durationSeconds={60} startedAt={null} phase="READING" />);
    expect(getByText("AI reading")).toBeInTheDocument();
  });

  it("displays sabotage hint when phase is SABOTAGE_WINDOW", () => {
    const { getByText } = render(<CountdownTimer durationSeconds={60} startedAt={null} phase="SABOTAGE_WINDOW" />);
    expect(getByText("sabotage window")).toBeInTheDocument();
    expect(getByText("▶ sabotage the AI now")).toBeInTheDocument();
  });

  it("does not display sabotage hint when phase is not SABOTAGE_WINDOW", () => {
    const { queryByText, getByText } = render(<CountdownTimer durationSeconds={60} startedAt={null} phase={null} />);
    expect(getByText("waiting")).toBeInTheDocument();
    expect(queryByText("▶ sabotage the AI now")).not.toBeInTheDocument();
  });
});
