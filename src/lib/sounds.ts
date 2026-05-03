let ctx: AudioContext | null = null;
let _muted = true; // default muted — judges hate auto-play

export function setMuted(v: boolean) { _muted = v; }
export function isMuted() { return _muted; }

function getCtx(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  if (!ctx) ctx = new window.AudioContext();
  return ctx;
}

function beep(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainPeak = 0.12,
  delay = 0
) {
  if (_muted) return;
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

/** "Incoming!" alert when a FUD card is played */
export function playCardPlayed() {
  beep(300, 0.06, "sawtooth", 0.08, 0);
  beep(600, 0.06, "sawtooth", 0.1, 0.07);
  beep(1000, 0.15, "square", 0.12, 0.14);
  beep(800, 0.2, "square", 0.09, 0.3);
}

let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;

/** Start low electronic drone during READING phase */
export function startAmbient() {
  if (_muted) return;
  const ac = getCtx();
  if (!ac || ambientOsc) return;

  ambientOsc = ac.createOscillator();
  ambientGain = ac.createGain();
  ambientOsc.connect(ambientGain);
  ambientGain.connect(ac.destination);

  ambientOsc.type = "sine";
  ambientOsc.frequency.setValueAtTime(55, ac.currentTime);
  // slow LFO-like drift
  ambientOsc.frequency.linearRampToValueAtTime(60, ac.currentTime + 4);
  ambientOsc.frequency.linearRampToValueAtTime(55, ac.currentTime + 8);

  ambientGain.gain.setValueAtTime(0, ac.currentTime);
  ambientGain.gain.linearRampToValueAtTime(0.06, ac.currentTime + 1.5);

  ambientOsc.start(ac.currentTime);
}

/** Fade out and stop ambient drone */
export function stopAmbient() {
  const ac = getCtx();
  if (!ac || !ambientOsc || !ambientGain) return;

  ambientGain.gain.setValueAtTime(ambientGain.gain.value, ac.currentTime);
  ambientGain.gain.linearRampToValueAtTime(0.001, ac.currentTime + 0.8);
  ambientOsc.stop(ac.currentTime + 0.85);
  ambientOsc = null;
  ambientGain = null;
}
