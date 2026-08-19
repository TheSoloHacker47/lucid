/**
 * Prisma (§4.1, §5.1, §5.2). The numbers below come straight from the design
 * doc's tuning table and are meant to be adjusted by feel — this is the file to
 * open when the game doesn't feel like Hollow Knight yet.
 */
import { G, TS, tap, clamp, rr, DREAM, NIGHT } from './state.js';
import { moveEntity, onHazard, hazardAt, ROOM_W, ROOM_H, map, COLS, ROWS } from './world.js';
import { RED, ORANGE, SHARD_NAME } from './data.js';
import { doShift } from './shift.js';
import { spawnParts } from './entities.js';
import { say } from './dialog.js';
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
const SLIDE = 0.6;        // wall-cling descent speed (Orange Shard)
const WALL_KICK = 2.6;    // horizontal kick off a wall-jump

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
  cling: 0,          // -1 clinging to a wall on the left, 1 on the right
  coyote: 0, buffer: 0,
  atk: 0, atkCd: 0, atkDown: 0, atkHit: 0,
  iframes: 0,
  flash: 0,          // white-flash frames after taking a hit
  blink: 0,          // damage-invulnerability blink (shifts never blink)
  land: 0,           // landing-squash frames
  idle: 0,           // frames without input (drives the ear flick)
  trail: [],         // recent head positions -> the mane/tail ribbons (§8.3)
};

/** Shards are a bitfield: index doubles as the ability and the rainbow colour. */
export const hasShard = (n) => G.shards >> n & 1;

export function grantShard(n) {
  if (hasShard(n)) return;
  G.shards |= 1 << n;
  G.seg = 7;
  G.hitstop = 12;
  G.shake = 5;
  spawnParts(player.x + 6, player.y + 6, 24, n);
  say(n === RED ? 5 : 6, 190);
  sfx.shard();
}

/** Put Prisma at the room's 'P' marker, or at the given edge on a transition. */
export function placePlayer(edge) {
  const p = player;
  p.vx = p.vy = 0;
  p.trail.length = 0;
  if (edge === 'l') { p.x = 2; return; }
  if (edge === 'r') { p.x = ROOM_W - p.w - 2; return; }
  for (let r = 0; r < ROWS; r++) {
    const c = map[r].indexOf('P');
    if (c >= 0) { p.x = c * TS + 2; p.y = r * TS + 4; return; }
  }
  p.x = 24; p.y = 24;   // rooms without a 'P' are only ever entered from an edge
}

/** Restore rainbow segments, capped at seven. */
export function heal(n) {
  G.seg = Math.min(7, G.seg + n);
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

/** Called when the strike connects, so pogo and recoil are shared by everything. */
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

  if (G.dead > 0) return;   // main.js handles the dissolve and the respawn

  // --- horizontal ---
  const left = G.key.l, right = G.key.r;
  if (left && !right)      { p.vx = Math.max(p.vx - ACCEL, -RUN); p.face = -1; }
  else if (right && !left) { p.vx = Math.min(p.vx + ACCEL, RUN);  p.face = 1; }
  else                     { p.vx *= p.onGround ? 0.72 : 0.94; if (Math.abs(p.vx) < 0.05) p.vx = 0; }

  p.idle = (left || right || !p.onGround) ? 0 : p.idle + 1;

  // --- wall cling (Orange Shard, §5.1) ---
  // Holding into a wall while falling slows the descent to a slide, and the
  // jump button then kicks away from it at roughly 45 degrees.
  const pressingInto = (p.cling < 0 && left) || (p.cling > 0 && right);
  if (hasShard(ORANGE) && !p.onGround && p.onWall && p.vy > 0 &&
      ((p.onWall < 0 && left) || (p.onWall > 0 && right))) {
    p.cling = p.onWall;
  } else if (p.onGround || !p.onWall || !pressingInto) {
    p.cling = 0;
  }

  // --- jump: coyote time + input buffer, both mandatory for feel (§5.1) ---
  if (tap('j')) p.buffer = BUFFER;
  if (p.buffer > 0) p.buffer--;
  if (p.coyote > 0) p.coyote--;

  if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = -JUMP;
    p.buffer = p.coyote = 0;
    p.onGround = 0;
    sfx.jump();
  } else if (p.buffer > 0 && p.cling) {
    p.vy = -JUMP * 0.95;
    p.vx = -p.cling * WALL_KICK;
    p.face = -p.cling;
    p.buffer = 0;
    p.cling = 0;
    sfx.jump();
  }

  // Holding jump while rising uses weaker gravity -> variable jump height.
  p.vy += (G.key.j && p.vy < 0) ? GRAV_HELD : GRAV;
  if (p.cling && p.vy > SLIDE) p.vy = SLIDE;
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

  // --- dream shift (locked until the Red Shard, §S04) ---
  if (tap('s') && hasShard(RED)) doShift(p);
  if (G.forceShift) { G.forceShift = 0; G.shiftCd = 0; doShift(p); }

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

  // Falling out of the room costs a segment and returns you to solid ground.
  if (p.y > ROOM_H + 32) {
    p.iframes = 0;
    hurt(p.x);
    if (G.seg > 0) { placePlayer(); p.iframes = 40; p.blink = 40; }
  }

  // The trailing-ribbon mane follows the head's recent history (§8.3).
  p.trail.unshift({ x: p.x + p.w / 2 - p.face * 3, y: p.y + 3 });
  if (p.trail.length > 10) p.trail.pop();
}
