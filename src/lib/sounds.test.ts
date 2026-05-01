import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { playTick, playUrgentTick, playWindowOpen, playCorrection, playWin, playLoss } from "./sounds";

describe("sounds", () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
    vi.restoreAllMocks();
  });

  it("handles when window is undefined", async () => {
    global.window = undefined as any;
    // Should return early and not throw
    expect(() => playTick()).not.toThrow();
  });

  it("handles when AudioContext is undefined", () => {
    global.window = {} as any;
    expect(() => playTick()).not.toThrow();
  });

  it("plays all sounds", () => {
    const mockGain = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      }
    };

    const mockOscillator = {
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
      },
      start: vi.fn(),
      stop: vi.fn(),
    };

    const mockAudioContext = vi.fn(function() {
      return {
        createGain: vi.fn(() => mockGain),
        createOscillator: vi.fn(() => mockOscillator),
        destination: {},
        currentTime: 100,
      };
    });

    global.window = {
      AudioContext: mockAudioContext,
    } as any;

    // First call sets ctx
    expect(() => playTick()).not.toThrow();
    // Subsequent calls reuse ctx
    expect(() => playUrgentTick()).not.toThrow();
    expect(() => playWindowOpen()).not.toThrow();
    expect(() => playCorrection()).not.toThrow();
    expect(() => playWin()).not.toThrow();
    expect(() => playLoss()).not.toThrow();
    
    // At least one oscillator created per beep
    expect(mockAudioContext).toHaveBeenCalledTimes(1);
    expect(mockOscillator.start).toHaveBeenCalled();
  });
});
