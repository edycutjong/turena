import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/font/google", () => ({
  JetBrains_Mono: () => ({ variable: "--font-mono" }),
  Inter: () => ({ variable: "--font-sans" }),
}));

vi.mock("@/components/DisclaimerModal", () => ({
  DisclaimerModal: () => <div data-testid="disclaimer">Disclaimer</div>,
}));

describe("RootLayout component", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.spyOn(console, "error").mockImplementation((msg, ...args) => {
      if (typeof msg === "string" && (msg.includes("cannot be a child of") || msg.includes("hydration error") || msg.includes("HTML, <html"))) {
        return;
      }
      console.warn("Unexpected console.error:", msg, ...args);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("renders layout children and parses localhost metadataBase when production URL is not set", async () => {
    const { default: RootLayout, metadata } = await import("./layout");
    const { getByTestId, getByText } = render(
      <RootLayout>
        <div data-testid="child">Test Child</div>
      </RootLayout>
    );

    expect(getByTestId("disclaimer")).toBeTruthy();
    expect(getByTestId("child")).toBeTruthy();
    expect(getByText("Test Child")).toBeTruthy();
    expect(metadata.metadataBase?.toString()).toBe("http://localhost:3000/");
  });

  it("parses production URL metadataBase when VERCEL_PROJECT_PRODUCTION_URL is set", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "example.vercel.app");
    const { metadata } = await import("./layout");
    expect(metadata.metadataBase?.toString()).toBe("https://example.vercel.app/");
  });
});
