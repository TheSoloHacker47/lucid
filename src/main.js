/**
 * LUCID — boot, input, room transitions, and the fixed-timestep game loop.
 *
 * js13kGames 2026 entry. Theme: Unicorns and Rainbows.
 * See LUCID_GAME_DESIGN_DOC.md for the full design; section numbers in the
 * comments throughout the source refer to it.
 */
import { G, W, H, TS, TITLE, PLAY, DREAM } from './state.js';
import { player, updatePlayer, placePlayer, hasShard } from './player.js';
import { spawnRoom, updateEnemies, updateShots, updateProps, updateParts } from './entities.js';
import { updateBoss } from './bosses.js';
import { updateShift } from './shift.js';
import { updateCamera, setRoom, room, ROOM_W } from './world.js';
import { updateDialog } from './dialog.js';
import { setCtx, drawFrame, drawTitle } from './render.js';
import { initAudio, toggleMute, applyWorld, setTempo } from './audio.js';
import { BESTIARY } from './data.js';

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

/** Enter a room and repopulate it. `edge` is the side Prisma walks in from. */
export function enterRoom(index, edge) {
  setRoom(index);
  spawnRoom();
  placePlayer(edge);
  updateCamera(player, 1);
  setTempo(!!G.boss);           // the boss room speeds the same music up
}

/** Audio may only start from a user gesture, and the title waits for one too. */
function begin() {
  initAudio();
  if (G.mode === TITLE) {
    G.mode = PLAY;
    enterRoom(0);
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

/** Saccharine's second phase summons Gloomlings; she borrows the spawner. */
function spawnGloomling(x, y) {
  const b = BESTIARY.G;
  G.ents.push({
    k: 'G', x, y, w: b.w, h: b.h, vx: 0, vy: 0, dir: 1,
    dmg: 0, timer: 20, flash: 0, hurtCd: 0,
  });
}

function step() {
  G.t++;
  if (G.mode === TITLE) return;

  // Hitstop: freeze the simulation but keep rendering. Two frames of this on
  // every landed strike is most of what makes combat feel good (§5.5).
  // Input is deliberately NOT snapshotted here, so a press during hitstop still
  // registers on the frame the world resumes.
  if (G.hitstop > 0) { G.hitstop--; return; }

  // Death: dissolve, then wake at the last Foalkeeper lantern, shards kept
  // (§5.3 — no corpse run; too punishing for a jam, and too many bytes).
  if (G.dead > 0) {
    if (--G.dead === 0) {
      G.seg = 7;
      G.world = DREAM;
      applyWorld(DREAM, 0.2);
      enterRoom(G.checkpoint);
      player.iframes = player.blink = 40;
    }
    updateParts();
    return;
  }

  updateShift();
  updateDialog();
  updatePlayer();
  updateEnemies();
  updateBoss(spawnGloomling);
  updateShots();
  updateProps();
  updateParts();

  // --- room transitions ---
  // The tile grid treats off-map columns as walls, which is what keeps enemies
  // inside a room. So the transition is explicit: Prisma is pressed against a
  // linked edge AND still holding that way, which also stops a knockback from
  // shoving her into the next room by accident.
  if (room.r !== undefined && player.x + player.w >= ROOM_W - 0.5 && G.key.r) enterRoom(room.r, 'l');
  else if (room.l !== undefined && player.x <= 0.5 && G.key.l) enterRoom(room.l, 'r');

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
    G, player, begin, enterRoom, hasShard,
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
