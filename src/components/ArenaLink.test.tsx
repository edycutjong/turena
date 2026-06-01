import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArenaLink } from "./ArenaLink";
import { useRouter } from "next/navigation";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() })
}));

describe("ArenaLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles transition overlay, navigation, and cleanup on click", () => {
    const { getByText } = render(
      <ArenaLink href="/target" className="custom-link">
        Go to Arena
      </ArenaLink>
    );

    const linkElement = getByText("Go to Arena");
    expect(linkElement).toBeTruthy();
    expect(linkElement.className).toBe("custom-link");

    // Click link
    fireEvent.click(linkElement);

    // Overlay should now be in the document body
    const overlay = document.querySelector(".arena-transition-overlay");
    expect(overlay).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();

    // Advance by 280ms to trigger navigation
    act(() => {
      vi.advanceTimersByTime(280);
    });

    expect(mockPush).toHaveBeenCalledWith("/target");
    // Overlay should still be present
    expect(document.querySelector(".arena-transition-overlay")).toBeTruthy();

    // Advance by 400ms to trigger overlay removal
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Overlay should be removed
    expect(document.querySelector(".arena-transition-overlay")).toBeNull();
  });
});
