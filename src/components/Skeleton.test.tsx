import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders with default classes", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("skeleton", "bg-arena-border", "rounded");
  });

  it("applies additional classNames", () => {
    const { container } = render(<Skeleton className="w-10 h-10" />);
    expect(container.firstChild).toHaveClass("w-10", "h-10");
  });
});
