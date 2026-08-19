/**
 * Prisma (§4.1, §5.1, §5.2). The numbers below come straight from the design
 * doc's tuning table and are meant to be adjusted by feel — this is the file to
 * open when the game doesn't feel like Hollow Knight yet.
 */
import { G, TS, tap, clamp, rr, rnd, hits } from './state.js';
import { moveEntity, onHazard, hazardAt, ROOM_W, ROOM_H } from './world.js';
import { ROOM } from './data.js';
import { doShift } from './shift.js';
import { spawnParts } from './entities.js';
import { sfx } from './audio.js';

// --- movement tuning (§5.1) --------------------------------------------------
const RUN = 2.2;          // top speed, px/frame
const ACCEL = RUN / 4;    // reach top speed in 4 frames: snappy, near-instant
const GRAV = 0.24;
const GRAV_HELD = 0.12;   // while jump is held AND rising -> variable height
const JUMP = 4.6;
const MAX_FALL = 6;
const COYOTE = 6;         // frames of grace after walking off a ledge
const BUFFER = 6;         // frames a jump press stays queued

// --- combat tuning (§5.2) ----------------------------------------------------
const ATK_FRAMES = 3;     // 3-frame lunge slash
const ATK_CD = 12;
export const ATK_REACH = 14;   // the crescent's arc radius
const POGO_VY = -4.2;
const RECOIL = 1.1;       // self-knockback on a landed hit: the "nail" feel
const IFRAMES = 60;

export const player = {
  x: 0, y: 0, w: 12, h: 12,
  vx: 0, vy: 0,
  face: 1,
  onGround: 0, onWall: 0,
  coyote: 0, buffer: 0,
  atk: 0, atkCd: 0, atkDown: 0, atkHit: 0,
  iframes: 0,
  flash: 0,          // white-flash frames after taking a hit
  blink: 0,          // damage-invulnerability blink (shifts never blink)
  land: 0,           // landing-squash frames
  idle: 0,           // frames without input (drives the ear flick)
  trail: [],         // recent head positions -> the mane/tail ribbons (§8.3)
  spawnX: 0, spawnY: 0,
};

/** Find 'P' in the room and put Prisma there. */
export function spawnPlayer() {
  for (let r = 0; r < ROOM.length; r++) {
    const c = ROOM[r].indexOf('P');
    if (c >= 0) { player.spawnX = c * TS + 2; player.spawnY = r * TS + 4; }
  }
  respawn();
}

export function respawn() {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = player.vy = 0;
  player.iframes = 30;
  player.blink = 30;
  player.trail.length = 0;
  G.seg = 7;
  G.dead = 0;
}

/** Take a hit: shatter the leftmost rainbow segment (§5.3). */
export function hurt(fromX) {
  if (player.iframes > 0 || G.dead) return;
  G.seg--;
  player.iframes = IFRAMES;
  player.blink = IFRAMES;
  player.flash = 3;
  G.hitstop = 4;
  G.shake = 4;
  player.vx = player.x < fromX ? -2.2 : 2.2;
  player.vy = -2.4;
  // The lost segment drips away in its own colour.
  spawnParts(player.x + 6, player.y + 6, 10, G.seg);
  sfx.hurt();
  if (G.seg <= 0) { G.dead = 90; sfx.hurt(); }
}

/** The horn strike's hitbox for this frame, or null. */
export function attackBox() {
  if (player.atk <= 0) return null;
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  return player.atkDown
    ? { x: cx - 9, y: cy + 2, w: 18, h: ATK_REACH }
    : { x: player.face > 0 ? cx : cx - ATK_REACH, y: cy - 9, w: ATK_REACH, h: 18 };
}

/** Called by entities.js when the strike connects, so pogo/recoil are shared. */
export function onStrikeLanded(targetX) {
  player.atkHit = 1;
  G.hitstop = 2;                    // 2-frame hitstop on every landed strike (§5.5)
  G.shake = 3;
  if (player.atkDown) {
    player.vy = POGO_VY;            // pogo: the most Hollow-Knight verb we have
    player.coyote = 0;
    sfx.pogo();
  } else {
    player.vx -= RECOIL * player.face;
    sfx.hit();
  }
}

export function updatePlayer() {
  const p = player;

  if (G.dead > 0) { G.dead--; if (!G.dead) respawn(); return; }

  // --- horizontal ---
  const left = G.key.l, right = G.key.r;
  if (left && !right)      { p.vx = Math.max(p.vx - ACCEL, -RUN); p.face = -1; }
  else if (right && !left) { p.vx = Math.min(p.vx + ACCEL, RUN);  p.face = 1; }
  else                     { p.vx *= p.onGround ? 0.72 : 0.94; if (Math.abs(p.vx) < 0.05) p.vx = 0; }

  p.idle = (left || right || !p.onGround) ? 0 : p.idle + 1;

  // --- jump: coyote time + input buffer, both mandatory for feel (§5.1) ---
  if (tap('j')) p.buffer = BUFFER;
  if (p.buffer > 0) p.buffer--;
  if (p.coyote > 0) p.coyote--;

  if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = -JUMP;
    p.buffer = p.coyote = 0;
    p.onGround = 0;
    sfx.jump();
  }

  // Holding jump while rising uses weaker gravity -> variable jump height.
  p.vy += (G.key.j && p.vy < 0) ? GRAV_HELD : GRAV;
  if (p.vy > MAX_FALL) p.vy = MAX_FALL;

  // --- attack ---
  if (p.atkCd > 0) p.atkCd--;
  if (p.atk > 0) p.atk--;
  if (tap('a') && p.atkCd <= 0) {
    p.atk = ATK_FRAMES;
    p.atkCd = ATK_CD;
    p.atkDown = G.key.d && !p.onGround ? 1 : 0;   // down-strike only in the air
    p.atkHit = 0;
  }
  // A swing that touched nothing gets a quieter whiff on its last frame.
  if (p.atk === 1 && !p.atkHit) sfx.whiff();

  // --- dream shift ---
  if (tap('s')) doShift(p);

  // --- integrate + collide ---
  const wasAir = !p.onGround;
  moveEntity(p, G.world);

  if (p.onGround) {
    p.coyote = COYOTE;
    if (wasAir) { p.land = 4; sfx.land(); }
  }
  if (p.land > 0) p.land--;
  if (p.flash > 0) p.flash--;
  if (p.iframes > 0) p.iframes--;
  if (p.blink > 0) p.blink--;

  // A down-strike pogos off spikes too, not just enemies (§5.2) — several
  // later platforming challenges are built on chaining these.
  if (p.atk > 0 && p.atkDown && !p.atkHit) {
    const b = attackBox();
    const foot = b.y + b.h - 2;
    if (hazardAt(b.x + 2, foot, G.world) || hazardAt(b.x + b.w / 2, foot, G.world) || hazardAt(b.x + b.w - 2, foot, G.world))
      onStrikeLanded(p.x);
  }

  // Spikes bite only in the nightmare (§8.5).
  if (onHazard(p, G.world)) hurt(p.x + p.w / 2 + (p.face > 0 ? -20 : 20));

  // Falling out of the room costs a segment and returns you to the spawn.
  if (p.y > ROOM_H + 32) {
    p.iframes = 0;
    hurt(p.x);
    if (G.seg > 0) { p.x = p.spawnX; p.y = p.spawnY; p.vx = p.vy = 0; p.trail.length = 0; }
  }
  p.x = clamp(p.x, 0, ROOM_W - p.w);

  // The trailing-ribbon mane follows the head's recent history (§8.3).
  p.trail.unshift({ x: p.x + p.w / 2 - p.face * 3, y: p.y + 3 });
  if (p.trail.length > 10) p.trail.pop();
}
