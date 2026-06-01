import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import BlockedPage from "./page";

describe("BlockedPage component", () => {
  it("renders blocked page content", () => {
    const { getByText } = render(<BlockedPage />);
    expect(getByText("ACCESS RESTRICTED")).toBeTruthy();
    expect(getByText(/Turena Arena is not available in your region/i)).toBeTruthy();
  });
});
