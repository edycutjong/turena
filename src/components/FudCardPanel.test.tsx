import { vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS = "0xescrow";
  process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend";
});

import { render, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { FudCardPanel } from "./FudCardPanel";
import { useWallet } from "@/hooks/useWallet";
import { useSabotageEvents } from "@/hooks/useSabotageEvents";
import { sendSabotageTx } from "@/lib/escrow";

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({ address: null, connected: false, connect: vi.fn() })),
}));

vi.mock("@/hooks/useSabotageEvents", () => ({
  useSabotageEvents: vi.fn(() => ({ byCard: {} })),
}));

vi.mock("@/lib/escrow", () => ({
  sendSabotageTx: vi.fn(),
}));

vi.mock("@/lib/sounds", () => ({
  playCardPlayed: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, onClick, disabled, className }: any) => (
      <button onClick={onClick} disabled={disabled} className={className}>
        {children}
      </button>
    ),
    span: ({ children }: any) => <span>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("FudCardPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(<FudCardPanel cycleId="cycle-1" isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders wallet connect action when disconnected", () => {
    vi.mocked(useWallet).mockReturnValue({
      address: null,
      connected: false,
      connect: vi.fn(),
    } as any);

    const { getByText } = render(<FudCardPanel cycleId="cycle-1" isOpen={true} />);
    expect(getByText("Connect wallet to play FUD cards")).toBeTruthy();

    const connectBtn = getByText("Connect wallet to play FUD cards");
    fireEvent.click(connectBtn);
    expect(useWallet().connect).toHaveBeenCalled();
  });

  it("renders active cards and handles successful card play transaction", async () => {
    vi.mocked(useWallet).mockReturnValue({
      address: "0xwallet",
      connected: true,
      connect: vi.fn(),
    } as any);
    
    vi.mocked(useSabotageEvents).mockReturnValue({
      byCard: {
        "CEO Arrested": { count: 1, totalMnt: 1 },
      },
    } as any);

    vi.mocked(sendSabotageTx).mockResolvedValue("0xhash123" as any);

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
    } as any);

    const { getByText } = render(<FudCardPanel cycleId="cycle-1" isOpen={true} />);

    expect(getByText("×1")).toBeTruthy();
    expect(getByText("CEO Arrested")).toBeTruthy();

    const ceoBtn = getByText("CEO Arrested");
    
    fireEvent.click(ceoBtn);

    await waitFor(() => {
      expect(sendSabotageTx).toHaveBeenCalledWith(1, "0xescrow");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/agent/sabotage"), expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("News just broke"),
      }));
      expect(getByText("✓")).toBeTruthy();
    });
  });

  it("handles transaction failure gracefully", async () => {
    vi.mocked(useWallet).mockReturnValue({
      address: "0xwallet",
      connected: true,
      connect: vi.fn(),
    } as any);
    vi.mocked(useSabotageEvents).mockReturnValue({ byCard: {} } as any);

    vi.mocked(sendSabotageTx).mockRejectedValue(new Error("Gas fee too high"));

    const { getByText } = render(<FudCardPanel cycleId="cycle-1" isOpen={true} />);
    const ceoBtn = getByText("CEO Arrested");

    fireEvent.click(ceoBtn);

    await waitFor(() => {
      expect(getByText("Gas fee too high")).toBeTruthy();
    });
  });

  it("handles DB record failure gracefully", async () => {
    vi.mocked(useWallet).mockReturnValue({
      address: "0xwallet",
      connected: true,
      connect: vi.fn(),
    } as any);
    vi.mocked(useSabotageEvents).mockReturnValue({ byCard: {} } as any);

    vi.mocked(sendSabotageTx).mockResolvedValue("0xtx" as any);

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
    } as any);

    const { getByText } = render(<FudCardPanel cycleId="cycle-1" isOpen={true} />);
    const ceoBtn = getByText("CEO Arrested");

    fireEvent.click(ceoBtn);

    await waitFor(() => {
      expect(getByText("Card played but DB record failed")).toBeTruthy();
    });
  });

  it("does not play card if cycleId is null", () => {
    vi.mocked(useWallet).mockReturnValue({
      address: "0xwallet",
      connected: true,
      connect: vi.fn(),
    } as any);
    const { getByText } = render(<FudCardPanel cycleId={null} isOpen={true} />);
    const ceoBtn = getByText("CEO Arrested");
    fireEvent.click(ceoBtn);
    expect(sendSabotageTx).not.toHaveBeenCalled();
  });

  it("handles generic transaction failure gracefully", async () => {
    vi.mocked(useWallet).mockReturnValue({
      address: "0xwallet",
      connected: true,
      connect: vi.fn(),
    } as any);
    vi.mocked(useSabotageEvents).mockReturnValue({ byCard: {} } as any);
    vi.mocked(sendSabotageTx).mockRejectedValue("Generic error message string");

    const { getByText } = render(<FudCardPanel cycleId="cycle-1" isOpen={true} />);
    const ceoBtn = getByText("CEO Arrested");

    fireEvent.click(ceoBtn);

    await waitFor(() => {
      expect(getByText("Transaction failed")).toBeTruthy();
    });
  });

  it("resets throwing state after animation timeout", async () => {
    vi.useFakeTimers();
    vi.mocked(useWallet).mockReturnValue({
      address: "0xwallet",
      connected: true,
      connect: vi.fn(),
    } as any);
    vi.mocked(useSabotageEvents).mockReturnValue({ byCard: {} } as any);
    vi.mocked(sendSabotageTx).mockResolvedValue("0xhash123" as any);
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: true } as any);

    const { getByText } = render(<FudCardPanel cycleId="cycle-1" isOpen={true} />);
    const ceoBtn = getByText("CEO Arrested");

    fireEvent.click(ceoBtn);

    // Wait for the async flow and timeouts to complete using fake timers
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(getByText("✓")).toBeTruthy();

    vi.useRealTimers();
  });
});
