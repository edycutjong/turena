import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TugOfWarBar } from "./TugOfWarBar";
import { useSabotageEvents } from "@/hooks/useSabotageEvents";
import { useCounterTrades } from "@/hooks/useCounterTrades";

vi.mock("@/hooks/useSabotageEvents", () => ({
  useSabotageEvents: vi.fn(),
}));

vi.mock("@/hooks/useCounterTrades", () => ({
  useCounterTrades: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, style, className }: any) => <div className={className} style={style}>{children}</div>,
  },
}));

describe("TugOfWarBar", () => {
  it("renders null when cycleId is null and pool values are zero", () => {
    vi.mocked(useSabotageEvents).mockReturnValue({ totalMnt: 0 } as any);
    vi.mocked(useCounterTrades).mockReturnValue({ totalPool: 0 } as any);

    const { container } = render(<TugOfWarBar cycleId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with 50/50 layout when cycleId is present but pool values are zero", () => {
    vi.mocked(useSabotageEvents).mockReturnValue({ totalMnt: 0 } as any);
    vi.mocked(useCounterTrades).mockReturnValue({ totalPool: 0 } as any);

    const { getByText, queryByText } = render(<TugOfWarBar cycleId="cycle-1" />);

    expect(getByText("AI 50%")).toBeTruthy();
    expect(getByText("Tug of War")).toBeTruthy();
    expect(getByText("Humans 50%")).toBeTruthy();
    expect(getByText("0.00 MNT vs AI")).toBeTruthy();
    expect(queryByText("sabotage")).toBeNull();
  });

  it("renders with calculated percentages and pool details when bets and sabotage are present", () => {
    vi.mocked(useSabotageEvents).mockReturnValue({ totalMnt: 5 } as any); // sabotage MNT
    vi.mocked(useCounterTrades).mockReturnValue({ totalPool: 10 } as any); // bet MNT

    // total = 15. humanPct = Math.round((15 / 16) * 100) = 94%. aiPct = 6%.
    const { getByText } = render(<TugOfWarBar cycleId="cycle-1" />);

    expect(getByText("AI 6%")).toBeTruthy();
    expect(getByText("Humans 94%")).toBeTruthy();
    expect(getByText("5.0 MNT sabotage · 10.00 MNT bets")).toBeTruthy();
    expect(getByText("15.00 MNT vs AI")).toBeTruthy();
  });
});
