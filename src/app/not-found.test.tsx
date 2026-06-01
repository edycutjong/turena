import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import NotFound from "./not-found";

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("NotFound component", () => {
  it("renders 404 page elements", () => {
    const { getByText } = render(<NotFound />);
    expect(getByText("404")).toBeTruthy();
    expect(getByText(/This page doesn't exist/i)).toBeTruthy();
    expect(getByText("← Back to Arena")).toBeTruthy();
  });
});
