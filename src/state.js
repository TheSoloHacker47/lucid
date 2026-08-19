/**
 * Shared mutable state + the handful of helpers every module needs.
 * Kept in its own module so nothing has to import from main.js (no cycles).
 * Design doc calls for a single `G` game-state object rather than an ECS (§11.3).
 */

export const W = 320, H = 180;   // internal render resolution (§8.1)
export const TS = 16;            // tile size (§8.5)
export const DREAM = 0, NIGHT = 1;

// Game modes
export const TITLE = 0, PLAY = 1;

export const G = {
  t: 0,             // frames elapsed since boot
  mode: TITLE,
  world: DREAM,     // which half of the world we are standing in

  // --- juice (§5.5) ---
  hitstop: 0,       // frames to freeze the simulation for
  shake: 0,         // screenshake magnitude, decays every frame

  // --- dream shift (§5.4) ---
  shiftCd: 0,       // cooldown frames remaining
  rip: 0,           // ripple frames remaining (0 = not shifting)
  ripX: 0, ripY: 0, // ripple origin, in world coordinates

  cam: { x: 0, y: 0 },
  ents: [],         // enemies
  parts: [],        // particles
  seg: 7,           // rainbow gauge segments remaining (§5.3)
  dead: 0,          // death-dissolve countdown

  key: {},          // keys held this frame
  pkey: {},         // keys held last frame (for edge detection)
};

/** True only on the frame an action goes down. */
export const tap = (k) => G.key[k] && !G.pkey[k];

export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

/**
 * mulberry32 — a deterministic seeded RNG (§11.3). Using this instead of
 * Math.random keeps particles and wobbles identical between runs, which makes
 * bugs reproducible and costs fewer bytes than it looks.
 */
let seed = 0x9e3779b9;
export const rnd = () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
/** Random float in [lo, hi). */
export const rr = (lo, hi) => lo + rnd() * (hi - lo);

/** Axis-aligned bounding box overlap. */
export const hits = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
