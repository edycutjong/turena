import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import GlobalError from "./global-error";

describe("GlobalError component", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("renders global error fallback and triggers reload", () => {
    const error = new Error("Fatal React Crash");
    const reset = vi.fn();

    const { getByText } = render(<GlobalError error={error} reset={reset} />);

    expect(getByText("Turena failed to load")).toBeTruthy();
    expect(getByText("Fatal React Crash")).toBeTruthy();

    const btn = getByText("Reload");
    fireEvent.click(btn);
    expect(reset).toHaveBeenCalled();
  });

  it("renders default fallback message when error message is empty", () => {
    const error = { message: "" } as Error;
    const reset = vi.fn();

    const { getByText } = render(<GlobalError error={error} reset={reset} />);

    expect(getByText("An unexpected error occurred.")).toBeTruthy();
  });
});
