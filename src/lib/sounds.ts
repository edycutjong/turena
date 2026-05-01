let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainPeak = 0.12,
  delay = 0
) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);

  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);

  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

/** Soft tick — one per second during countdown */
export function playTick() {
  beep(880, 0.05, "square", 0.04);
}

/** Urgent tick for ≤5 seconds */
export function playUrgentTick() {
  beep(1200, 0.07, "square", 0.06);
}

/** Counter window just opened — ascending alert */
export function playWindowOpen() {
  beep(440, 0.15, "sine", 0.1, 0);
  beep(660, 0.15, "sine", 0.1, 0.1);
  beep(880, 0.3, "sine", 0.12, 0.2);
}

/** Self-correction triggered — descending then ascending chime */
export function playCorrection() {
  beep(880, 0.15, "sine", 0.1, 0);
  beep(660, 0.15, "sine", 0.1, 0.12);
  beep(440, 0.15, "sine", 0.1, 0.24);
  beep(660, 0.2, "sine", 0.12, 0.4);
  beep(880, 0.3, "sine", 0.12, 0.55);
}

/** Win chime — quick ascending triad */
export function playWin() {
  beep(523, 0.12, "sine", 0.1, 0);
  beep(659, 0.12, "sine", 0.1, 0.1);
  beep(784, 0.25, "sine", 0.12, 0.2);
}

/** Loss buzz — low descending */
export function playLoss() {
  beep(220, 0.2, "sawtooth", 0.08, 0);
  beep(180, 0.3, "sawtooth", 0.06, 0.15);
}
