// Zvučni efekti intra, sintetizovani Web Audio API-jem (bez audio fajlova).
// Podrazumevano isključeni; uključuju se samo na klik korisnika.

let ctx = null;
let enabled = false;

export function setSoundEnabled(on) {
  enabled = on;
  if (on && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (on && ctx?.state === 'suspended') ctx.resume();
}
export const isSoundEnabled = () => enabled;

function noiseBuffer(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Težak udarac u beton: nisko "bum" + prašnjavi šum. */
export function playThud() {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);

  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(1, t + 0.008);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  osc.connect(og).connect(out);
  osc.start(t); osc.stop(t + 0.65);

  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.9);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(240, t + 0.7);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.55, t + 0.01);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  n.connect(lp).connect(ng).connect(out);
  n.start(t); n.stop(t + 0.9);
}

/** Metalni "šink" makaza: neharmonski parcijali + visokofrekventni šum. */
export function playShink() {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.35;
  out.connect(ctx.destination);

  [2870, 4130, 5390, 7020].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.97, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4 / (i + 1), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5 + i * 0.12);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 1);
  });

  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.25);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 6500;
  bp.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.7, t + 0.004);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  n.connect(bp).connect(ng).connect(out);
  n.start(t); n.stop(t + 0.25);
}
