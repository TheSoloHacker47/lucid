/**
 * Audio (§9). Instead of pulling in a library we render short buffers with a
 * small synth: a swept oscillator crossfaded with noise under a power envelope.
 *
 * The music is the story told twice (§9.2). ONE melody is rendered into two
 * buffers — major and slow for the dream, the same notes in minor and an octave
 * down with a noise bed for the nightmare. Both loops are the same length and
 * are started on the same sample, so they stay locked together forever; the
 * shift just crossfades the two gain nodes over 0.4s. Same tune, two worlds:
 * a large narrative payoff for one extra buffer.
 */
let ac = null;
let muted = 0;
let dreamGain, nightGain, sources = [];

/** Browsers require audio to start from a user gesture, so we boot lazily. */
export function initAudio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    startMusic();
  }
  if (ac.state === 'suspended') ac.resume();
}

export const toggleMute = () => {
  muted ^= 1;
  if (dreamGain) applyWorld(currentWorld, 0.1);
  return muted;
};
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

export const sfx = {
  jump:  () => tone(320, 620, 0.12, 0.16, 0.05, 2, 0),
  land:  () => tone(180,  70, 0.08, 0.13, 0.35, 3, 0),
  hit:   () => tone(520, 120, 0.10, 0.22, 0.30, 2, 0),   // horn connects
  whiff: () => tone(700, 400, 0.06, 0.06, 0.55, 3, 0),
  hurt:  () => tone(260,  60, 0.26, 0.24, 0.25, 1.6, 0),
  pogo:  () => tone(240, 700, 0.13, 0.19, 0.10, 2, 0),
  mote:  () => tone(700, 1100, 0.10, 0.13, 0.02, 2, 0),
  chime: () => { tone(660, 660, 0.30, 0.11, 0.02, 2, 0); tone(990, 990, 0.36, 0.08, 0.02, 2, 0); },
  shot:  () => tone(420, 260, 0.09, 0.10, 0.25, 3, 0),
  roar:  () => tone(150,  60, 0.55, 0.26, 0.45, 1.2, 0),
  stomp: () => tone(110,  40, 0.24, 0.30, 0.55, 2, 0),
  shard: () => { tone(520, 1040, 0.45, 0.16, 0.02, 1.6, 1); tone(780, 1560, 0.5, 0.10, 0.02, 2, 0); },
  // The signature sound: a reversed sweep, so the shift feels like an inhale.
  shift: () => { tone(180, 1400, 0.30, 0.15, 0.05, 2.2, 1); tone(900, 240, 0.22, 0.10, 0.20, 2, 0); },
};

// ─── music ───────────────────────────────────────────────────────────────────

/**
 * The lullaby, as semitone offsets from the root. -1 is a rest. Sixteen beats,
 * played twice per loop with the second pass an octave up in the dream.
 */
const MELODY = [0, 4, 7, 11, 9, 7, 4, -1, 2, 5, 9, 12, 11, 9, 5, -1];
const BASS = [0, -1, -1, -1, 5, -1, -1, -1, 3, -1, -1, -1, 7, -1, -1, -1];

/** Minor is the same melody with the 3rd, 6th and 7th flattened (§9.2). */
const MINOR = { 4: 3, 9: 8, 11: 10, 5: 5, 2: 2, 7: 7, 12: 12, 0: 0, 3: 3 };

const BEAT = 0.38;               // seconds per beat -> a slow lullaby
const BEATS = MELODY.length * 2;

const hz = (semi, root) => root * Math.pow(2, semi / 12);

/**
 * Additively render one full loop into a buffer.
 * @param minor flatten the thirds and sixths
 * @param dark  drop an octave and add a breathing noise bed
 */
function renderLoop(minor, dark) {
  const rate = ac.sampleRate;
  const len = Math.round(BEATS * BEAT * rate);
  const buf = ac.createBuffer(1, len, rate);
  const ch = buf.getChannelData(0);
  const root = dark ? 98 : 196;   // G3 / G2

  const note = (semi, beat, dur, vol, wobble) => {
    if (semi < 0) return;
    const f = hz(minor ? (MINOR[semi] ?? semi) : semi, root);
    const start = Math.round(beat * BEAT * rate);
    const n = Math.min(Math.round(dur * BEAT * rate), len - start);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      // Soft attack, long decay: a plucked music-box rather than a stab.
      const env = Math.min(1, t * 22) * Math.pow(1 - t, 1.8);
      const p = (start + i) / rate * f * 6.283185;
      ch[start + i] += (Math.sin(p) + Math.sin(p * 2) * 0.22) * env * vol * (1 + Math.sin(i / rate * wobble) * 0.04);
    }
  };

  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < MELODY.length; i++) {
      const beat = pass * MELODY.length + i;
      // The dream lifts an octave on the repeat; the nightmare stays down.
      note(MELODY[i] + (pass && !dark ? 12 : 0), beat, 1.6, 0.20, 5);
      note(BASS[i] - 12, beat, 3.6, 0.16, 3);
    }

  if (dark) {
    // A slow breathing hiss under the nightmare loop.
    for (let i = 0; i < len; i++)
      ch[i] += (Math.random() * 2 - 1) * 0.020 * (0.5 + 0.5 * Math.sin(i / rate * 1.1));
  }
  return buf;
}

let currentWorld = 0;

function startMusic() {
  dreamGain = ac.createGain();
  nightGain = ac.createGain();
  dreamGain.gain.value = muted ? 0 : 0.5;
  nightGain.gain.value = 0;
  dreamGain.connect(ac.destination);
  nightGain.connect(ac.destination);

  // Both loops are the same length and start on the same sample, so they never
  // drift and the crossfade lands mid-phrase without a seam.
  const at = ac.currentTime + 0.12;
  sources = [renderLoop(0, 0), renderLoop(1, 1)].map((buf, i) => {
    const s = ac.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.connect(i ? nightGain : dreamGain);
    s.start(at);
    return s;
  });
}

/** Crossfade to the given world's loop (§9.2: 0.4s, gains only). */
export function applyWorld(world, time = 0.4) {
  currentWorld = world;
  if (!ac || !dreamGain) return;
  const t = ac.currentTime;
  const vol = muted ? 0 : 0.5;
  dreamGain.gain.cancelScheduledValues(t);
  nightGain.gain.cancelScheduledValues(t);
  dreamGain.gain.setValueAtTime(dreamGain.gain.value, t);
  nightGain.gain.setValueAtTime(nightGain.gain.value, t);
  dreamGain.gain.linearRampToValueAtTime(world ? 0 : vol, t + time);
  nightGain.gain.linearRampToValueAtTime(world ? vol : 0, t + time);
}

/**
 * Boss music is the same two loops played faster and higher (§9.2's "faster
 * variation"), which costs nothing: both sources share the rate, so they stay
 * in sync with each other.
 */
export function setTempo(fast) {
  if (!ac) return;
  for (const s of sources) s.playbackRate.linearRampToValueAtTime(fast ? 1.32 : 1, ac.currentTime + 0.5);
}
