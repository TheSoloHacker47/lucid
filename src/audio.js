/**
 * Audio (§9). Instead of pulling in a library we render short buffers with a
 * ~20 line synth: a swept oscillator crossfaded with noise under a power
 * envelope. That covers every sound Gate A needs and stays fully in budget.
 *
 * Music (dream/nightmare loops with a shared melody) arrives at Gate B.
 */
let ac = null;
let muted = 0;

/** Browsers require audio to start from a user gesture, so we boot lazily. */
export function initAudio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
}

export const toggleMute = () => (muted ^= 1);
export const isMuted = () => muted;

/**
 * @param f0    start frequency        @param f1  end frequency
 * @param dur   seconds                @param vol peak amplitude
 * @param noise 0 = pure tone, 1 = pure noise
 * @param decay envelope power (higher = snappier)
 * @param rev   render the envelope backwards (swells instead of decays)
 */
function tone(f0, f1, dur, vol, noise, decay, rev) {
  if (!ac || muted) return;
  const rate = ac.sampleRate, len = dur * rate | 0;
  const buf = ac.createBuffer(1, len, rate), ch = buf.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    phase += (f0 + (f1 - f0) * t) / rate * 6.283185;
    const env = Math.pow(rev ? t : 1 - t, decay);
    ch[i] = (Math.sin(phase) * (1 - noise) + (Math.random() * 2 - 1) * noise) * env * vol;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(ac.destination);
  src.start();
}

/** The 5 sounds Gate A needs to judge feel by (§9.1). */
export const sfx = {
  jump:  () => tone(320, 620, 0.12, 0.16, 0.05, 2, 0),
  land:  () => tone(180,  70, 0.08, 0.13, 0.35, 3, 0),
  hit:   () => tone(520, 120, 0.10, 0.22, 0.30, 2, 0),   // horn connects
  whiff: () => tone(700, 400, 0.06, 0.06, 0.55, 3, 0),
  hurt:  () => tone(260,  60, 0.26, 0.24, 0.25, 1.6, 0),
  pogo:  () => tone(240, 700, 0.13, 0.19, 0.10, 2, 0),
  // The signature sound: a reversed sweep, so the shift feels like an inhale.
  shift: () => { tone(180, 1400, 0.30, 0.15, 0.05, 2.2, 1); tone(900, 240, 0.22, 0.10, 0.20, 2, 0); },
};
