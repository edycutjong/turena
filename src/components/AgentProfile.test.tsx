import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentProfile } from "./AgentProfile";
import { useAgentState } from "@/hooks/useAgentState";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

vi.mock("next/link", () => ({
  default: ({ children }: any) => <div>{children}</div>
}));

vi.mock("@/hooks/useAgentState", () => ({
  useAgentState: vi.fn(),
}));

describe("AgentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders default layout when agent state is null", () => {
    vi.mocked(useAgentState).mockReturnValue(null);

    const { getByText, queryByText } = render(<AgentProfile agentId="agent-0" />);

    expect(getByText("TuringAgent #0")).toBeTruthy();
    expect(getByText("1200")).toBeTruthy(); // default ELO
    expect(getByText("CONFIDENT")).toBeTruthy(); // default emotion label
    expect(queryByText("consecutive losses")).toBeNull();
    expect(queryByText("Verify on Mantle Explorer")).toBeNull();
  });

  it("renders with active agent state and MELTDOWN state", () => {
    vi.mocked(useAgentState).mockReturnValue({
      id: "agent-0",
      agent_id: "agent-0",
      win_rate: 0.45,
      total_trades: 15,
      total_pnl: -5.4,
      elo_rating: 1100,
      emotion_state: "MELTDOWN",
      consecutive_losses: 4,
      self_corrections_count: 2,
      current_params: {},
      updated_at: "",
    });

    const { getByText } = render(<AgentProfile agentId="agent-0" contractAddress="0x5555" />);

    expect(getByText("1100")).toBeTruthy();
    expect(getByText("MELTDOWN")).toBeTruthy();
    expect(getByText("45.0%")).toBeTruthy();
    expect(getByText("-5.40 MNT")).toBeTruthy();
    expect(getByText("4 consecutive losses")).toBeTruthy();
    expect(getByText("Verify on Mantle Explorer")).toBeTruthy();
  });

  it("renders stats with win rate >= 50% and positive P&L", () => {
    vi.mocked(useAgentState).mockReturnValue({
      id: "agent-0",
      agent_id: "agent-0",
      win_rate: 0.65,
      total_trades: 20,
      total_pnl: 12.8,
      elo_rating: 1350,
      emotion_state: "CONFIDENT",
      consecutive_losses: 0,
      self_corrections_count: 5,
      current_params: {},
      updated_at: "",
    });

    const { getByText } = render(<AgentProfile agentId="agent-0" />);

    expect(getByText("1350")).toBeTruthy();
    expect(getByText("CONFIDENT")).toBeTruthy();
    expect(getByText("65.0%")).toBeTruthy();
    expect(getByText("+12.80 MNT")).toBeTruthy();
  });

  it("renders with CAUTIOUS/ANXIOUS/TILTED states and single consecutive loss", () => {
    vi.mocked(useAgentState).mockReturnValue({
      id: "agent-0",
      agent_id: "agent-0",
      win_rate: 0.50,
      total_trades: 10,
      total_pnl: 0,
      elo_rating: 1210,
      emotion_state: "TILTED",
      consecutive_losses: 1,
      self_corrections_count: 1,
      current_params: {},
      updated_at: "",
    });

    const { getByText } = render(<AgentProfile agentId="agent-0" />);

    expect(getByText("TILTED")).toBeTruthy();
    expect(getByText("1 consecutive loss")).toBeTruthy();
  });
});
