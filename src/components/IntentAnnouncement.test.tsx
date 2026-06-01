import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IntentAnnouncement } from "./IntentAnnouncement";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("IntentAnnouncement", () => {
  it("renders null when not visible or intent is null", () => {
    const { container: c1 } = render(<IntentAnnouncement intent={null} visible={true} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <IntentAnnouncement intent={{ action: "long", asset: "MNT", confidence: 0.9 }} visible={false} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it("renders LONGING decision with correct formatting", () => {
    const intent = { action: "long" as const, asset: "MNT", confidence: 0.887 };
    const { container } = render(<IntentAnnouncement intent={intent} visible={true} />);

    expect(container.textContent).toContain("I am");
    expect(container.textContent).toContain("LONGING");
    expect(container.textContent).toContain("MNT");
    expect(container.textContent).toContain("Confidence: 89%");
    expect(container.textContent).toContain("COUNTER?");
  });

  it("renders SHORTING decision", () => {
    const intent = { action: "short" as const, asset: "BTC", confidence: 0.5 };
    const { container } = render(<IntentAnnouncement intent={intent} visible={true} />);

    expect(container.textContent).toContain("SHORTING");
    expect(container.textContent).toContain("BTC");
    expect(container.textContent).toContain("Confidence: 50%");
  });
});
