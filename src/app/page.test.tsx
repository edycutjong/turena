import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Home from "./page";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock Next Link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock Components used on the page
vi.mock("@/components/AppNav", () => ({
  AppNav: ({ right }: any) => <div>{right}</div>,
}));

vi.mock("@/components/ArenaLink", () => ({
  ArenaLink: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("Landing Home Page", () => {
  it("renders the landing page elements without crashing", () => {
    const { getByText, getAllByText } = render(<Home />);
    
    // Check main title parts
    expect(getByText(/Watch AI Trade/i)).toBeTruthy();
    expect(getByText(/Sabotage It/i)).toBeTruthy();
    expect(getByText(/The Turing Arena · ERC-8004 on Mantle/i)).toBeTruthy();
    
    // Check organizers & sponsors
    expect(getAllByText(/Mantle/i).length).toBeGreaterThan(0);
    expect(getAllByText(/DoraHacks/i).length).toBeGreaterThan(0);
    
    // Check CTA buttons
    const ctas = getAllByText(/Enter the Arena →/i);
    expect(ctas.length).toBeGreaterThan(0);
  });
});
