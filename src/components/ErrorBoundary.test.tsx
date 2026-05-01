import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Happy Child</div>
      </ErrorBoundary>
    );
    expect(getByText("Happy Child")).toBeInTheDocument();
  });

  it("renders default fallback when an error occurs", () => {
    // Suppress console.error to avoid noise in the test output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const ErrorChild = () => {
      throw new Error("Test error");
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ErrorChild />
      </ErrorBoundary>
    );

    expect(getByText("Component error — check console")).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it("renders custom fallback when provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const ErrorChild = () => {
      throw new Error("Test error");
    };

    const { getByText } = render(
      <ErrorBoundary fallback={<div>Custom Error View</div>}>
        <ErrorChild />
      </ErrorBoundary>
    );

    expect(getByText("Custom Error View")).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});
