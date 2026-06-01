import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DisclaimerModal } from "./DisclaimerModal";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("DisclaimerModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("does not render when already accepted in localStorage", () => {
    localStorage.setItem("turena_disclaimer_accepted", "1");
    const { queryByText } = render(<DisclaimerModal />);
    expect(queryByText("Before you enter the arena")).toBeNull();
  });

  it("renders when not accepted and sets key on button click", () => {
    const { getByText, queryByText } = render(<DisclaimerModal />);
    expect(getByText("Before you enter the arena")).toBeTruthy();

    const acceptBtn = getByText("I Understand — Enter Arena");
    fireEvent.click(acceptBtn);

    // Sets key
    expect(localStorage.getItem("turena_disclaimer_accepted")).toBe("1");
    // Closes modal
    expect(queryByText("Before you enter the arena")).toBeNull();
  });
});
