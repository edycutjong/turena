import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { playTick, playUrgentTick, playWindowOpen, playCorrection, playWin, playLoss, setMuted, isMuted, playCardPlayed, startAmbient, stopAmbient } from "./sounds";

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
    setMuted(false);
    global.window = undefined as any;
    // Should return early and not throw
    expect(() => playTick()).not.toThrow();
  });

  it("handles when AudioContext is undefined", () => {
    setMuted(false);
    global.window = {} as any;
    expect(() => playTick()).not.toThrow();
  });

  it("plays all sounds", () => {
    setMuted(false);
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
        linearRampToValueAtTime: vi.fn(),
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
    expect(() => playCardPlayed()).not.toThrow();

    // Ambient tests
    expect(() => startAmbient()).not.toThrow();
    // Second call should return early (already started)
    expect(() => startAmbient()).not.toThrow();
    expect(() => stopAmbient()).not.toThrow();
    // Stop again when null
    expect(() => stopAmbient()).not.toThrow();
    
    // At least one oscillator created per beep
    expect(mockAudioContext).toHaveBeenCalledTimes(1);
    expect(mockOscillator.start).toHaveBeenCalled();
    
    setMuted(true);
    expect(isMuted()).toBe(true);
  });

  it("handles ambient with undefined AudioContext", () => {
    setMuted(false);
    global.window = {} as any;
    expect(() => startAmbient()).not.toThrow();
    expect(() => stopAmbient()).not.toThrow();
    setMuted(true);
  });

  it("returns early when muted", () => {
    setMuted(true);
    // Should not throw or crash
    expect(() => playTick()).not.toThrow();
    expect(() => startAmbient()).not.toThrow();
  });
});
