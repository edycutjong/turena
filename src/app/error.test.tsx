import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import ErrorComponent from "./error";

describe("Error component", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("renders error message and retry button", () => {
    const error = new Error("Database timeout") as Error & { digest?: string };
    error.digest = "ERR-123";
    const reset = vi.fn();

    const { getByText } = render(<ErrorComponent error={error} reset={reset} />);

    expect(getByText("Something crashed")).toBeTruthy();
    expect(getByText("Database timeout")).toBeTruthy();
    expect(getByText("Ref: ERR-123")).toBeTruthy();

    const btn = getByText("Try again");
    fireEvent.click(btn);
    expect(reset).toHaveBeenCalled();
  });

  it("renders default fallback message when error message is empty", () => {
    const error = { message: "" } as Error & { digest?: string };
    const reset = vi.fn();

    const { getByText, queryByText } = render(<ErrorComponent error={error} reset={reset} />);

    expect(getByText("An unexpected error occurred.")).toBeTruthy();
    expect(queryByText("Ref:")).toBeNull();
  });
});
