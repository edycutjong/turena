import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import ArenaPage from "./page";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { useAgentState } from "@/hooks/useAgentState";
import { startAmbient, stopAmbient, playWindowOpen, playWin, playLoss } from "@/lib/sounds";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("@/hooks/useActiveCycle", () => ({
  useActiveCycle: vi.fn(),
}));

vi.mock("@/hooks/useCounterTrades", () => ({
  useCounterTrades: () => ({ totalPool: 100, againstPool: 40 }),
}));

vi.mock("@/hooks/useAgentState", () => ({
  useAgentState: vi.fn(),
}));

let walletConnected = false;
let walletAddress: string | null = null;
const mockConnect = vi.fn();

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ address: walletAddress, connected: walletConnected, connect: mockConnect }),
}));

vi.mock("@/lib/sounds", () => ({
  playWindowOpen: vi.fn(),
  setMuted: vi.fn(),
  startAmbient: vi.fn(),
  stopAmbient: vi.fn(),
  playWin: vi.fn(),
  playLoss: vi.fn(),
}));

// Mock child components
vi.mock("@/components/AppNav", () => ({
  AppNav: ({ right, sub }: any) => <div data-testid="appnav">{sub} {right}</div>,
}));

vi.mock("@/components/AgentProfile", () => ({
  AgentProfile: () => <div data-testid="agentprofile">AgentProfile</div>,
}));

vi.mock("@/components/MarketChart", () => ({
  MarketChart: () => <div data-testid="marketchart">MarketChart</div>,
}));

vi.mock("@/components/CountdownTimer", () => ({
  CountdownTimer: ({ phase, onExpire }: any) => (
    <button data-testid="countdowntimer" onClick={onExpire}>
      {phase}
    </button>
  ),
}));

vi.mock("@/components/IntentAnnouncement", () => ({
  IntentAnnouncement: ({ visible }: any) => <div data-testid="intentannouncement">{visible ? "visible" : "hidden"}</div>,
}));

vi.mock("@/components/CounterTradeButton", () => ({
  CounterTradeButton: ({ isOpen, onBetSuccess }: any) => (
    <button data-testid="countertradebutton" onClick={() => onBetSuccess("mock-tx-hash")}>
      {isOpen ? "open" : "closed"}
    </button>
  ),
}));

vi.mock("@/components/CoTTerminal", () => ({
  CoTTerminal: ({ agentId, onEmotionChange }: any) => (
    <div data-testid="cotterminal">
      <span>{agentId}</span>
      <button data-testid="trigger-emotion" onClick={() => onEmotionChange && onEmotionChange("MELTDOWN")}>
        Trigger MELTDOWN
      </button>
    </div>
  ),
}));

vi.mock("@/components/SpectatorChat", () => ({
  SpectatorChat: () => <div data-testid="spectatorchat">SpectatorChat</div>,
}));

vi.mock("@/components/FudCardPanel", () => ({
  FudCardPanel: () => <div data-testid="fudcardpanel">FudCardPanel</div>,
}));

vi.mock("@/components/SabotageFeed", () => ({
  SabotageFeed: () => <div data-testid="sabotagefeed">SabotageFeed</div>,
}));

vi.mock("@/components/TugOfWarBar", () => ({
  TugOfWarBar: () => <div data-testid="tugofwarbar">TugOfWarBar</div>,
}));

vi.mock("@/components/TradeHistory", () => ({
  TradeHistory: () => <div data-testid="tradehistory">TradeHistory</div>,
}));

vi.mock("@/components/SelfCorrectionOverlay", () => ({
  SelfCorrectionOverlay: () => <div data-testid="selfcorrectionoverlay">SelfCorrectionOverlay</div>,
}));

vi.mock("@/components/ConfettiBurst", () => ({
  ConfettiBurst: ({ type, onDone }: any) => (
    <button data-testid="confettiburst" onClick={onDone}>
      {type}
    </button>
  ),
}));

describe("ArenaPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue({} as any);
    vi.mocked(useAgentState).mockReturnValue({ emotion_state: "CONFIDENT" } as any);
    walletConnected = false;
    walletAddress = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders basic components in Standby/Idle state", () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByTestId, getByText } = render(<ArenaPage />);
    expect(getByTestId("appnav").textContent).toContain("Idle");
    expect(getByText("Connect Wallet")).toBeTruthy(); // wallet mock connection check
  });

  it("renders wallet address if connected", () => {
    walletConnected = true;
    walletAddress = "0x1234567890123456789012345678901234567890";
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByText } = render(<ArenaPage />);
    expect(getByText("0x1234…7890")).toBeTruthy();
  });

  it("handles active cycle with READING phase and triggers ambient sound", () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "READING",
    } as any);

    render(<ArenaPage />);
    expect(startAmbient).toHaveBeenCalled();
  });

  it("handles SABOTAGE_WINDOW phase correctly", () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "SABOTAGE_WINDOW",
      sabotage_started_at: new Date().toISOString(),
    } as any);

    const { getByTestId } = render(<ArenaPage />);
    expect(playWindowOpen).toHaveBeenCalled();
    expect(getByTestId("fudcardpanel")).toBeTruthy();
    expect(getByTestId("sabotagefeed")).toBeTruthy();
    expect(getByTestId("tugofwarbar")).toBeTruthy();
  });

  it("dev trigger cycle button triggers backend fetch API", async () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByText } = render(<ArenaPage />);
    const btn = getByText("[dev] trigger cycle");

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/agent/run-cycle"), { method: "POST" });
  });

  it("dev open window button triggers window open state", async () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByText, getByTestId } = render(<ArenaPage />);
    const btn = getByText("[dev] open window");

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(playWindowOpen).toHaveBeenCalled();
    expect(getByTestId("intentannouncement").textContent).toBe("visible");
  });

  it("mute button toggles sound muting state", async () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByText } = render(<ArenaPage />);
    const muteBtn = getByText("🔇");

    await act(async () => {
      fireEvent.click(muteBtn);
    });

    expect(getByText("🔊")).toBeTruthy();
  });

  it("triggers win celebration burst when transitioning to SETTLED cycle with win result", async () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "READING",
    } as any);

    const { rerender, getByTestId } = render(<ArenaPage />);
    
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "SETTLED",
      result: "win",
    } as any);

    rerender(<ArenaPage />);
    expect(playWin).toHaveBeenCalled();
    expect(getByTestId("confettiburst").textContent).toBe("win");
  });

  it("triggers loss celebration burst when transitioning to SETTLED cycle with loss result", async () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "READING",
    } as any);

    const { rerender, getByTestId } = render(<ArenaPage />);
    
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "SETTLED",
      result: "loss",
    } as any);

    rerender(<ArenaPage />);
    expect(playLoss).toHaveBeenCalled();
    expect(getByTestId("confettiburst").textContent).toBe("loss");
  });

  it("handles onExpire callback to close window", () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByTestId } = render(<ArenaPage />);
    
    // Trigger onExpire
    act(() => {
      fireEvent.click(getByTestId("countdowntimer"));
    });

    expect(getByTestId("intentannouncement").textContent).toBe("hidden");
  });

  it("handles onBetSuccess callback", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(useActiveCycle).mockReturnValue(null);
    const { getByTestId } = render(<ArenaPage />);
    
    act(() => {
      fireEvent.click(getByTestId("countertradebutton"));
    });

    expect(infoSpy).toHaveBeenCalledWith("Bet placed:", "mock-tx-hash");
    infoSpy.mockRestore();
  });

  it("handles ConfettiBurst onDone callback", () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "READING",
    } as any);

    const { rerender, getByTestId } = render(<ArenaPage />);
    
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "SETTLED",
      result: "win",
    } as any);

    rerender(<ArenaPage />);
    expect(getByTestId("confettiburst").textContent).toBe("win");

    // Click burst to call onDone
    act(() => {
      fireEvent.click(getByTestId("confettiburst"));
    });

    // Content should become empty string because type is null
    expect(getByTestId("confettiburst").textContent).toBe("");
  });

  it("handles emotional state updates from CoTTerminal and triggers MELTDOWN style", async () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "READING",
    } as any);

    const { getAllByTestId, container } = render(<ArenaPage />);
    
    // Default style should not have bg-red-950/30
    expect(container.firstElementChild?.className).not.toContain("bg-red-950/30");

    // Trigger emotion change from CoTTerminal mock
    await act(async () => {
      fireEvent.click(getAllByTestId("trigger-emotion")[0]);
    });

    // Meltdown style class should now be applied
    expect(container.firstElementChild?.className).toContain("bg-red-950/30");
  });

  it("handles fallback to database emotion_state", () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    vi.mocked(useAgentState).mockReturnValue({ emotion_state: "TILTED" } as any);
    const { container } = render(<ArenaPage />);
    expect(container.firstElementChild?.className).toContain("bg-orange-950/20");
  });

  it("handles SABOTAGE_WINDOW phase without start timestamp", () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "SABOTAGE_WINDOW",
      sabotage_started_at: null, // missing timestamp
    } as any);

    render(<ArenaPage />);
    expect(playWindowOpen).not.toHaveBeenCalled();
  });

  it("handles SETTLED phase with unknown result", () => {
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "READING",
    } as any);

    const { rerender } = render(<ArenaPage />);
    
    vi.mocked(useActiveCycle).mockReturnValue({
      id: "cycle-1",
      cycle_number: 5,
      phase: "SETTLED",
      result: "unknown" as any, // unknown/fallback result
    } as any);

    rerender(<ArenaPage />);
    expect(playWin).not.toHaveBeenCalled();
    expect(playLoss).not.toHaveBeenCalled();
  });

  it("handles fallback to CONFIDENT when agentState and cotEmotion are null", () => {
    vi.mocked(useActiveCycle).mockReturnValue(null);
    vi.mocked(useAgentState).mockReturnValue(null);
    const { container } = render(<ArenaPage />);
    expect(container.firstElementChild?.className).not.toContain("bg-orange-950/20");
    expect(container.firstElementChild?.className).not.toContain("bg-red-950/30");
  });
});
