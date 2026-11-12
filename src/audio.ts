/**
 * Tiny synthesised sound set (Web Audio), so there are no audio files to ship.
 * Browsers only allow audio after a user gesture; the context is created lazily
 * on the first call and `unlock()` is wired to the first pointer/key press.
 */
const KEY = 'spider.sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
try {
  enabled = localStorage.getItem(KEY) !== 'off';
} catch {
  /* storage unavailable: sound stays on */
}

function context(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** A short filtered noise burst: the "paper" part of a card tap. */
function noise(c: AudioContext, when: number, dur: number, freq: number, q: number, gain: number) {
  const length = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  source.connect(filter);
  filter.connect(g);
  g.connect(master!);
  source.start(when);
}

interface ToneOptions {
  from: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  lowpass?: number;
}

function tone(c: AudioContext, when: number, { from, to = from, dur, type = 'sine', gain = 0.2, lowpass }: ToneOptions) {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, when);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, when + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  if (lowpass) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;
    osc.connect(lp);
    lp.connect(g);
  } else {
    osc.connect(g);
  }
  g.connect(master!);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

export const sound = {
  /** Create the audio context from inside a user gesture. */
  unlock() {
    context();
  },

  isEnabled: () => enabled,

  setEnabled(on: boolean) {
    enabled = on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  },

  /** Legal move: a crisp tap with a soft thump underneath. */
  move() {
    const c = context();
    if (!c) return;
    const t = c.currentTime;
    noise(c, t, 0.05, 2600, 1.1, 0.5);
    tone(c, t, { from: 200, to: 110, dur: 0.09, gain: 0.24 });
  },

  /** Illegal move: two low, dull bumps that fall in pitch. */
  illegal() {
    const c = context();
    if (!c) return;
    const t = c.currentTime;
    tone(c, t, { from: 215, to: 140, dur: 0.13, type: 'square', gain: 0.09, lowpass: 700 });
    tone(c, t + 0.1, { from: 165, to: 100, dur: 0.17, type: 'square', gain: 0.09, lowpass: 650 });
  },

  /** A row dealt from the stock: ten quick ticks, one per column. */
  deal() {
    const c = context();
    if (!c) return;
    const t = c.currentTime;
    for (let i = 0; i < 10; i++) noise(c, t + i * 0.038, 0.035, 1900 + i * 70, 1.1, 0.34);
    tone(c, t, { from: 150, to: 95, dur: 0.1, gain: 0.14 });
  },

  /** A finished K-to-A run: a short rising chime. */
  run() {
    const c = context();
    if (!c) return;
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(c, t + i * 0.085, { from: f, dur: 0.55, gain: 0.13 });
      tone(c, t + i * 0.085, { from: f * 2, dur: 0.3, type: 'triangle', gain: 0.04 });
    });
  },
};
