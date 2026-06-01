import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppNav } from "./AppNav";

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}));

describe("AppNav", () => {
  it("renders basic title and subtitle", () => {
    const { getByText, queryByText } = render(<AppNav />);
    expect(getByText("Turena")).toBeTruthy();
    expect(getByText("The Turing Arena")).toBeTruthy();
    expect(queryByText("SubHeader")).toBeNull();
  });

  it("renders with sub and right nodes", () => {
    const { getByText } = render(
      <AppNav sub={<span>SubHeader</span>} right={<button>ClickMe</button>} />
    );

    expect(getByText("SubHeader")).toBeTruthy();
    expect(getByText("ClickMe")).toBeTruthy();
  });
});
