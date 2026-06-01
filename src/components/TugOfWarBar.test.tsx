import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TugOfWarBar } from "./TugOfWarBar";
import { useCounterTrades } from "@/hooks/useCounterTrades";

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
    vi.mocked(useCounterTrades).mockReturnValue({ deepSeekPool: 0, openAIPool: 0 } as any);

    const { container } = render(<TugOfWarBar cycleId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with 50/50 layout when cycleId is present but pool values are zero", () => {
    vi.mocked(useCounterTrades).mockReturnValue({ deepSeekPool: 0, openAIPool: 0 } as any);

    const { getByText, queryByText } = render(<TugOfWarBar cycleId="cycle-1" />);

    expect(getByText("DeepSeek 50%")).toBeTruthy();
    expect(getByText("Pool Balance")).toBeTruthy();
    expect(getByText("OpenAI 50%")).toBeTruthy();
    expect(getByText("Total: 0.00 MNT")).toBeTruthy();
  });

  it("renders with calculated percentages and pool details when bets are present", () => {
    vi.mocked(useCounterTrades).mockReturnValue({ deepSeekPool: 15, openAIPool: 5 } as any); // total = 20

    // deepSeekPct = (15/20) * 100 = 75%. openAIPct = 25%.
    const { getByText } = render(<TugOfWarBar cycleId="cycle-1" />);

    expect(getByText("DeepSeek 75%")).toBeTruthy();
    expect(getByText("OpenAI 25%")).toBeTruthy();
    expect(getByText("15.00 MNT")).toBeTruthy(); // DeepSeek pool
    expect(getByText("5.00 MNT")).toBeTruthy(); // OpenAI pool
    expect(getByText("Total: 20.00 MNT")).toBeTruthy();
  });

  it("renders tie indicator when pools are equal and greater than 0", () => {
    vi.mocked(useCounterTrades).mockReturnValue({ deepSeekPool: 10, openAIPool: 10 } as any);

    const { getByText, container } = render(<TugOfWarBar cycleId="cycle-1" />);

    expect(getByText("DeepSeek 50%")).toBeTruthy();
    expect(getByText("OpenAI 50%")).toBeTruthy();
    
    // Test that the tie indicator is rendered (it has the animate-pulse class)
    const tieIndicator = container.querySelector(".animate-pulse");
    expect(tieIndicator).not.toBeNull();
  });
});
