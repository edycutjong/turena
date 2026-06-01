import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CounterTradeButton } from "./CounterTradeButton";
import { placeBetTx } from "@/lib/escrow";

vi.mock("@/lib/escrow", () => ({
  placeBetTx: vi.fn(),
  MANTLE_EXPLORER: "https://explorer",
}));

describe("CounterTradeButton", () => {
  const mockOnConnect = vi.fn();
  const mockOnBetSuccess = vi.fn();
  const defaultProps = {
    isOpen: true,
    deepSeekPool: 10.0,
    openAIPool: 4.0,
    cycleNumber: 1,
    walletAddress: "0xwallet" as const,
    onConnect: mockOnConnect,
    onBetSuccess: mockOnBetSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly in idle state", () => {
    const { getByText } = render(<CounterTradeButton {...defaultProps} />);
    expect(getByText("⚡ Place Bet")).toBeTruthy();
    expect(getByText("DeepSeek")).toBeTruthy();
    expect(getByText("10.0 MNT")).toBeTruthy();
    expect(getByText("OpenAI")).toBeTruthy();
    expect(getByText("4.0 MNT")).toBeTruthy();
  });

  it("calls onConnect if wallet is not connected", () => {
    const { getByText } = render(<CounterTradeButton {...defaultProps} walletAddress={null} />);
    fireEvent.click(getByText("Connect Wallet"));
    expect(mockOnConnect).toHaveBeenCalled();
  });

  it("goes through the bet flow successfully for DeepSeek", async () => {
    vi.mocked(placeBetTx).mockResolvedValue("0xhash123");
    const { getByText, getByRole, queryByText } = render(<CounterTradeButton {...defaultProps} />);

    // Click Place Bet
    fireEvent.click(getByText("⚡ Place Bet"));
    expect(getByText("Who Wins This Cycle?")).toBeTruthy();

    // Click DeepSeek
    fireEvent.click(getByText("DeepSeek", { selector: 'button' }));
    expect(getByText("Bet on DeepSeek")).toBeTruthy();

    // Confirm
    fireEvent.click(getByText("Confirm"));
    expect(getByText("Confirming in Wallet...")).toBeTruthy();

    await waitFor(() => {
      expect(placeBetTx).toHaveBeenCalledWith(1, 1, 1, expect.any(String));
      expect(mockOnBetSuccess).toHaveBeenCalledWith("0xhash123");
      expect(getByText(/0xhash123/)).toBeTruthy();
    });
  });

  it("handles bet error", async () => {
    vi.mocked(placeBetTx).mockRejectedValue(new Error("RPC Error"));
    const { getByText, getByRole } = render(<CounterTradeButton {...defaultProps} />);

    fireEvent.click(getByText("⚡ Place Bet"));
    fireEvent.click(getByText("OpenAI", { selector: 'button' }));
    fireEvent.click(getByText("Confirm"));

    await waitFor(() => {
      expect(getByText("RPC Error")).toBeTruthy();
    });

    // Dismiss error
    fireEvent.click(getByText("Dismiss"));
    expect(getByText("⚡ Place Bet")).toBeTruthy();
  });

  it("handles invalid bet amount", () => {
    const { getByText, getByRole } = render(<CounterTradeButton {...defaultProps} />);

    // Click Place Bet
    fireEvent.click(getByText("⚡ Place Bet"));
    
    // Click DeepSeek
    fireEvent.click(getByText("DeepSeek", { selector: 'button' }));

    // Change input
    const input = getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0.1' } });
    
    // Confirm
    fireEvent.click(getByText("Confirm"));

    // Should show error
    expect(getByText("Bet must be between 0.5 and 50 MNT")).toBeTruthy();
  });

  it("does nothing if clicked when closed", () => {
    const { getByText } = render(<CounterTradeButton {...defaultProps} isOpen={false} />);
    expect(getByText("Waiting…")).toBeTruthy();
    fireEvent.click(getByText("Waiting…"));
    // Ensure betState doesn't change to "pick"
    expect(() => getByText("Who Wins This Cycle?")).toThrow();
  });

  it("does nothing if clicked when cycleNumber is null", () => {
    const { getByText } = render(<CounterTradeButton {...defaultProps} cycleNumber={null} />);
    fireEvent.click(getByText("⚡ Place Bet"));
    expect(() => getByText("Who Wins This Cycle?")).toThrow();
  });

  it("handles non-Error rejection", async () => {
    vi.mocked(placeBetTx).mockRejectedValue("Some weird string error");
    const { getByText } = render(<CounterTradeButton {...defaultProps} />);

    fireEvent.click(getByText("⚡ Place Bet"));
    fireEvent.click(getByText("OpenAI", { selector: 'button' }));
    fireEvent.click(getByText("Confirm"));

    await waitFor(() => {
      expect(getByText("Transaction failed")).toBeTruthy();
    });
  });

  it("does nothing if confirmed when cycleNumber becomes null", () => {
    const { getByText, rerender } = render(<CounterTradeButton {...defaultProps} />);
    fireEvent.click(getByText("⚡ Place Bet"));
    fireEvent.click(getByText("DeepSeek", { selector: 'button' }));
    
    // Now remove cycle number
    rerender(<CounterTradeButton {...defaultProps} cycleNumber={null} />);
    
    fireEvent.click(getByText("Confirm"));
    
    // Should not call placeBetTx
    expect(placeBetTx).not.toHaveBeenCalled();
  });
});