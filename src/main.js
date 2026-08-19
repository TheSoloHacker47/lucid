/**
 * LUCID — boot, input, and the fixed-timestep game loop.
 *
 * js13kGames 2026 entry. Theme: Unicorns and Rainbows.
 * See LUCID_GAME_DESIGN_DOC.md for the full design; section numbers in the
 * comments throughout the source refer to it.
 */
import { G, W, H, TITLE, PLAY } from './state.js';
import { player, updatePlayer, spawnPlayer } from './player.js';
import { spawnEnemies, updateEnemies, updateParts } from './entities.js';
import { updateShift } from './shift.js';
import { updateCamera } from './world.js';
import { setCtx, drawFrame, drawTitle } from './render.js';
import { initAudio, toggleMute } from './audio.js';

// ─── canvas ──────────────────────────────────────────────────────────────────
// Render at a low internal resolution and scale up with pixelated filtering:
// cheap to draw, cohesive chunky look, and mobile-friendly (§8.1).
const canvas = document.getElementById('c');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
setCtx(ctx);

function fit() {
  const scale = Math.max(1, Math.min(innerWidth / W, innerHeight / H));
  canvas.style.width = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
}
onresize = fit;
fit();

// ─── input (§10) ─────────────────────────────────────────────────────────────
const KEYS = {
  ArrowLeft: 'l', KeyA: 'l',
  ArrowRight: 'r', KeyD: 'r',
  ArrowDown: 'd',
  ArrowUp: 'j', KeyW: 'j', KeyZ: 'j', Space: 'j',
  KeyX: 'a', KeyJ: 'a',
  KeyS: 's', KeyK: 's',
  KeyM: 'm',
};

/** Audio may only start from a user gesture, and the title waits for one too. */
function begin() {
  initAudio();
  if (G.mode === TITLE) {
    G.mode = PLAY;
    spawnPlayer();
    spawnEnemies();
  }
}

onkeydown = (e) => {
  const k = KEYS[e.code];
  if (k) { e.preventDefault(); G.key[k] = 1; }
  if (k === 'm') toggleMute();
  begin();
};
onkeyup = (e) => { const k = KEYS[e.code]; if (k) G.key[k] = 0; };
onpointerdown = begin;

// ─── loop ────────────────────────────────────────────────────────────────────
// Fixed 60Hz simulation with an accumulator, rendering decoupled from it, so
// physics tuning means the same thing on every monitor.
const STEP = 1000 / 60;
let acc = 0, last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min(now - last, 100);   // clamp so a backgrounded tab can't spiral
  last = now;
  while (acc >= STEP) { acc -= STEP; step(); }
  G.mode === TITLE ? drawTitle() : drawFrame();
}

function step() {
  G.t++;
  if (G.mode === TITLE) return;

  // Hitstop: freeze the simulation but keep rendering. Two frames of this on
  // every landed strike is most of what makes combat feel good (§5.5).
  // Input is deliberately NOT snapshotted here, so a press during hitstop still
  // registers on the frame the world resumes.
  if (G.hitstop > 0) { G.hitstop--; return; }

  updateShift();
  updatePlayer();
  updateEnemies();
  updateParts();
  updateCamera(player);
  if (G.shake > 0.3) G.shake *= 0.82; else G.shake = 0;

  for (const k in G.key) G.pkey[k] = G.key[k];
}

requestAnimationFrame(frame);

// ─── debug hooks ─────────────────────────────────────────────────────────────
// `DEV` is replaced with a literal at build time, so this whole block is dead
// code the minifier removes from the shipped bundle.
if (DEV) {
  window.L = {
    G, player,
    begin,
    /** Advance the simulation n frames and draw, ignoring requestAnimationFrame. */
    frames(n = 1) {
      for (let i = 0; i < n; i++) { step(); }
      G.mode === TITLE ? drawTitle() : drawFrame();
    },
    hold(k, on = 1) { G.key[k] = on ? 1 : 0; },
    /** Press a key for exactly one simulated frame. */
    press(k) { G.key[k] = 1; step(); G.key[k] = 0; },
  };
}
