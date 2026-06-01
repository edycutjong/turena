import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SelfCorrectionOverlay } from "./SelfCorrectionOverlay";
import { useSelfCorrections } from "@/hooks/useSelfCorrections";
import { playCorrection } from "@/lib/sounds";

vi.mock("@/hooks/useSelfCorrections", () => ({
  useSelfCorrections: vi.fn(),
}));

vi.mock("@/lib/sounds", () => ({
  playCorrection: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("SelfCorrectionOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders nothing when latest is null", () => {
    vi.mocked(useSelfCorrections).mockReturnValue({ latest: null } as any);
    const { container } = render(<SelfCorrectionOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("shows overlay when latest correction is provided, dismisses after timeout", async () => {
    const mockCorrection = {
      id: "c1",
      parameter_changed: "tolerance",
      old_value: "0.5",
      new_value: "0.25",
      regret_score: 95,
      tx_hash: "0xhash1234567890abcdef1234567890abcdef",
    };

    vi.mocked(useSelfCorrections).mockReturnValue({ latest: mockCorrection } as any);

    const { getByText, queryByText, rerender } = render(<SelfCorrectionOverlay />);

    expect(playCorrection).toHaveBeenCalled();
    expect(getByText("Self-Correction Triggered")).toBeTruthy();
    expect(getByText("tolerance")).toBeTruthy();
    expect(getByText("0.5000")).toBeTruthy();
    expect(getByText("0.2500")).toBeTruthy();
    expect(getByText("95")).toBeTruthy();
    // It slices first 22 chars -> 0xhash1234567890abcdef
    expect(getByText("↗ 0xhash1234567890abcdef… (Mantle Explorer)")).toBeTruthy();

    // Advance 6 seconds to trigger auto-dismiss
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Re-render to capture state change
    rerender(<SelfCorrectionOverlay />);
    expect(queryByText("Self-Correction Triggered")).toBeNull();
  });

  it("closes overlay immediately when close button is clicked", () => {
    const mockCorrection = {
      id: "c1",
      parameter_changed: "tolerance",
      old_value: "0.5",
      new_value: "0.25",
      regret_score: 95,
      tx_hash: null,
    };

    vi.mocked(useSelfCorrections).mockReturnValue({ latest: mockCorrection } as any);

    const { getByText, queryByText, rerender } = render(<SelfCorrectionOverlay />);
    expect(getByText("Self-Correction Triggered")).toBeTruthy();

    const closeBtn = getByText("✕");
    fireEvent.click(closeBtn);

    rerender(<SelfCorrectionOverlay />);
    expect(queryByText("Self-Correction Triggered")).toBeNull();
  });
});
