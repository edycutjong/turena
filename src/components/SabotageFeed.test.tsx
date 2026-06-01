import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SabotageFeed } from "./SabotageFeed";
import { useSabotageEvents } from "@/hooks/useSabotageEvents";

vi.mock("@/hooks/useSabotageEvents", () => ({
  useSabotageEvents: vi.fn(),
}));

describe("SabotageFeed", () => {
  it("renders null when there are no events", () => {
    vi.mocked(useSabotageEvents).mockReturnValue({ events: [] } as any);
    const { container } = render(<SabotageFeed cycleId="cycle-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders horizontal event list when events are present", () => {
    const mockEvents = [
      { id: "e1", card_type: "CEO Arrested", mnt_paid: 1 },
      { id: "e2", card_type: "Vitalik Sold", mnt_paid: 2 },
      { id: "e3", card_type: "Unknown Label", mnt_paid: 3 },
    ];
    vi.mocked(useSabotageEvents).mockReturnValue({ events: mockEvents } as any);

    const { getByText } = render(<SabotageFeed cycleId="cycle-1" />);

    expect(getByText("FUD ›")).toBeTruthy();
    expect(getByText("CEO Arrested")).toBeTruthy();
    expect(getByText("1 MNT")).toBeTruthy();
    expect(getByText("Vitalik Sold")).toBeTruthy();
    expect(getByText("2 MNT")).toBeTruthy();
    expect(getByText("Unknown Label")).toBeTruthy();
    expect(getByText("3 MNT")).toBeTruthy();
  });
});
