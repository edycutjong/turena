import { vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS = "0xescrow";
});

import { render, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { CounterTradeButton } from "./CounterTradeButton";
import { placeBetTx } from "@/lib/escrow";

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, onClick, disabled, className }: any) => (
      <button onClick={onClick} disabled={disabled} className={className}>
        {children}
      </button>
    ),
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/escrow", () => ({
  placeBetTx: vi.fn(),
  MANTLE_EXPLORER: "https://explorer",
}));

describe("CounterTradeButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Connect Wallet when walletAddress is null, and calls onConnect on click", () => {
    const onConnect = vi.fn();
    const { getByText } = render(
      <CounterTradeButton
        isOpen={true}
        totalPool={10}
        againstPool={4}
        cycleNumber={5}
        walletAddress={null}
        onConnect={onConnect}
        onBetSuccess={vi.fn()}
      />
    );

    const btn = getByText("Connect Wallet");
    expect(btn).toBeTruthy();

    fireEvent.click(btn);
    expect(onConnect).toHaveBeenCalled();
  });

  it("renders Waiting when wallet is connected but window is closed", () => {
    const { getByText } = render(
      <CounterTradeButton
        isOpen={false}
        totalPool={10}
        againstPool={4}
        cycleNumber={5}
        walletAddress="0xwallet"
        onConnect={vi.fn()}
        onBetSuccess={vi.fn()}
      />
    );

    expect(getByText("Waiting…")).toBeTruthy();
    const btn = getByText("Waiting…");
    fireEvent.click(btn); // should do nothing
  });

  it("handles bet dialog flow: confirm, change amount, place tx success", async () => {
    const onBetSuccess = vi.fn();
    vi.mocked(placeBetTx).mockResolvedValue("0xhash1234567890abcdef");

    const { getByText, getByRole, queryByText } = render(
      <CounterTradeButton
        isOpen={true}
        totalPool={10}
        againstPool={4}
        cycleNumber={5}
        walletAddress="0xwallet"
        onConnect={vi.fn()}
        onBetSuccess={onBetSuccess}
      />
    );

    // Initial click opens confirm panel
    const actionBtn = getByText("⚡ Counter Trade");
    fireEvent.click(actionBtn);

    expect(getByText("Bet against AI")).toBeTruthy();
    const confirmBtn = getByText("Confirm");
    const cancelBtn = getByText("Cancel");

    // Click cancel resets dialog
    fireEvent.click(cancelBtn);
    expect(getByText("⚡ Counter Trade")).toBeTruthy();

    // Re-open
    fireEvent.click(getByText("⚡ Counter Trade"));

    // Set amount below min
    const input = getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0.2" } });
    fireEvent.click(getByText("Confirm"));

    expect(getByText("Bet must be between 0.5 and 2 MNT")).toBeTruthy();
    fireEvent.click(getByText("Dismiss"));

    // Wait for the error view to dismiss
    await waitFor(() => {
      expect(queryByText("Bet must be between 0.5 and 2 MNT")).toBeNull();
    });

    // Re-open and place success
    fireEvent.click(getByText("⚡ Counter Trade"));
    const newInput = getByRole("spinbutton");
    fireEvent.change(newInput, { target: { value: "1.5" } });
    
    fireEvent.click(getByText("Confirm"));

    await waitFor(() => {
      expect(placeBetTx).toHaveBeenCalledWith(5, 1.5, "0xescrow");
      expect(onBetSuccess).toHaveBeenCalledWith("0xhash1234567890abcdef");
      expect(getByText("✓ Bet Placed")).toBeTruthy();
      expect(getByText("0xhash1234… View on Explorer ↗")).toBeTruthy();
    });
  });

  it("handles bet tx failure", async () => {
    vi.mocked(placeBetTx).mockRejectedValue(new Error("RPC Timeout"));

    const { getByText, getByRole } = render(
      <CounterTradeButton
        isOpen={true}
        totalPool={10}
        againstPool={4}
        cycleNumber={5}
        walletAddress="0xwallet"
        onConnect={vi.fn()}
        onBetSuccess={vi.fn()}
      />
    );

    // Open confirm
    fireEvent.click(getByText("⚡ Counter Trade"));

    // Place bet
    fireEvent.click(getByText("Confirm"));

    await waitFor(() => {
      expect(getByText("RPC Timeout")).toBeTruthy();
    });
  });

  it("handles bet tx fallback text on generic rejection error", async () => {
    vi.mocked(placeBetTx).mockRejectedValue("Generic error object");

    const { getByText } = render(
      <CounterTradeButton
        isOpen={true}
        totalPool={10}
        againstPool={4}
        cycleNumber={5}
        walletAddress="0xwallet"
        onConnect={vi.fn()}
        onBetSuccess={vi.fn()}
      />
    );

    // Open confirm
    fireEvent.click(getByText("⚡ Counter Trade"));

    // Place bet
    fireEvent.click(getByText("Confirm"));

    await waitFor(() => {
      expect(getByText("Transaction failed")).toBeTruthy();
    });
  });

  it("does not proceed if cycleNumber becomes null when confirm is clicked", () => {
    const { getByText, rerender } = render(
      <CounterTradeButton
        isOpen={true}
        totalPool={10}
        againstPool={4}
        cycleNumber={5}
        walletAddress="0xwallet"
        onConnect={vi.fn()}
        onBetSuccess={vi.fn()}
      />
    );

    // Open confirm
    fireEvent.click(getByText("⚡ Counter Trade"));

    // Change cycleNumber to null
    rerender(
      <CounterTradeButton
        isOpen={true}
        totalPool={10}
        againstPool={4}
        cycleNumber={null}
        walletAddress="0xwallet"
        onConnect={vi.fn()}
        onBetSuccess={vi.fn()}
      />
    );

    // Click confirm
    fireEvent.click(getByText("Confirm"));

    // placeBetTx should not have been called
    expect(placeBetTx).not.toHaveBeenCalled();
  });
});
