import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CoTTerminal from "./CoTTerminal";
import { useCoTStream } from "@/hooks/useCoTStream";

vi.mock("@/hooks/useCoTStream", () => ({
  useCoTStream: vi.fn(),
}));

describe("CoTTerminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders waiting state when cycleId is null and no tokens", () => {
    vi.mocked(useCoTStream).mockReturnValue([]);
    const { getByText } = render(<CoTTerminal cycleId={null} />);
    expect(getByText("Waiting for cycle initiation...")).toBeTruthy();
    expect(getByText("○ Idle")).toBeTruthy();
    expect(getByText("CONFIDENT")).toBeTruthy();
  });

  it("renders streaming tokens and handles emotion changes", () => {
    const mockTokens = [
      { id: 1, token_type: "reasoning", token_text: "Checking balances..." },
      { id: 2, token_type: "emotion", token_text: "ANXIOUS" },
      { id: 3, token_type: "intent", token_text: "BUY MNT" },
      { id: 4, token_type: "emotion", token_text: "MELTDOWN" },
      { id: 5, token_type: "correction", token_text: "Correcting mistake..." },
    ];
    vi.mocked(useCoTStream).mockReturnValue(mockTokens as any);

    const onEmotionChange = vi.fn();

    const { getByText, queryByText } = render(
      <CoTTerminal cycleId="cycle-123" agentId="agent-99" onEmotionChange={onEmotionChange} />
    );

    // Verify token rendering
    expect(getByText("Checking balances...")).toBeTruthy();
    expect(getByText("BUY MNT")).toBeTruthy();
    expect(getByText("Correcting mistake...")).toBeTruthy();
    // Emotion tokens should NOT be rendered in body text
    expect(queryByText("ANXIOUS")).toBeNull();

    // Latest emotion (MELTDOWN) should be set and onEmotionChange called
    expect(getByText("MELTDOWN")).toBeTruthy();
    expect(onEmotionChange).toHaveBeenCalledWith("MELTDOWN");
    expect(getByText("● Live")).toBeTruthy();
  });

  it("handles TILTED emotion style classing", () => {
    const mockTokens = [
      { id: 1, token_type: "emotion", token_text: "TILTED" },
    ];
    vi.mocked(useCoTStream).mockReturnValue(mockTokens as any);

    const { getByText } = render(<CoTTerminal cycleId="cycle-123" />);
    expect(getByText("TILTED")).toBeTruthy();
  });

  it("handles CAUTIOUS emotion style classing", () => {
    const mockTokens = [
      { id: 1, token_type: "emotion", token_text: "CAUTIOUS" },
    ];
    vi.mocked(useCoTStream).mockReturnValue(mockTokens as any);

    const { getByText } = render(<CoTTerminal cycleId="cycle-123" />);
    expect(getByText("CAUTIOUS")).toBeTruthy();
  });

  it("handles ANXIOUS emotion style classing", () => {
    const mockTokens = [
      { id: 1, token_type: "emotion", token_text: "ANXIOUS" },
    ];
    vi.mocked(useCoTStream).mockReturnValue(mockTokens as any);

    const { getByText } = render(<CoTTerminal cycleId="cycle-123" />);
    expect(getByText("ANXIOUS")).toBeTruthy();
  });

  it("handles new token streaming and classing", () => {
    const initialTokens = [
      { id: 1, token_type: "reasoning", token_text: "First token" },
    ];
    vi.mocked(useCoTStream).mockReturnValue(initialTokens as any);

    const { rerender, container } = render(<CoTTerminal cycleId="cycle-123" />);

    // Rerender with a new token appended
    const updatedTokens = [
      { id: 1, token_type: "reasoning", token_text: "First token" },
      { id: 2, token_type: "reasoning", token_text: "Second token" },
    ];
    vi.mocked(useCoTStream).mockReturnValue(updatedTokens as any);

    rerender(<CoTTerminal cycleId="cycle-123" />);

    // The second token should have the "token-in" class
    const spans = container.querySelectorAll("span");
    let foundNewClass = false;
    spans.forEach((span) => {
      if (span.textContent === "Second token" && span.className.includes("token-in")) {
        foundNewClass = true;
      }
    });
    expect(foundNewClass).toBe(true);
  });
});
