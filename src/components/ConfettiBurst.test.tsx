import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConfettiBurst } from "./ConfettiBurst";

describe("ConfettiBurst", () => {
  let mockContext: any;
  let rafSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock canvas context
    mockContext = {
      clearRect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext);

    // Mock window sizes
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders null when type is null", () => {
    const { container } = render(<ConfettiBurst type={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders canvas and animates win burst then calls onDone", () => {
    const onDone = vi.fn();

    // Mock requestAnimationFrame to run immediately
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    const { container } = render(<ConfettiBurst type="win" onDone={onDone} />);
    
    // Expect canvas to be rendered
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);

    // Assert that the drawing functions were executed
    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled(); // Since cb runs synchronously to completion
  });

  it("renders canvas and animates loss burst", () => {
    const onDone = vi.fn();

    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    const { container } = render(<ConfettiBurst type="loss" onDone={onDone} />);
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(onDone).toHaveBeenCalled();
  });

  it("handles null context gracefully", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const onDone = vi.fn();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    const { container } = render(<ConfettiBurst type="win" onDone={onDone} />);
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

});
