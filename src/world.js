/**
 * The world: room loading, tile lookup, world-conditional collision, entity
 * movement, camera, and room-to-room transitions.
 *
 * Every question of the form "is this solid?" goes through solidAt(), which is
 * the ONLY place that knows a tile can exist in one world and not the other
 * (§11.3). Player, enemies and bosses all share it, so adding a new
 * world-conditional tile type is a one-line change.
 */
import { ROOMS } from './data.js';
import { G, TS, W, H, DREAM, NIGHT, clamp } from './state.js';

export let room = ROOMS[0];
export let map = room.m;
export let COLS = map[0].length;
export let ROWS = map.length;
export let ROOM_W = COLS * TS;
export let ROOM_H = ROWS * TS;

/** Swap in a room and recompute its dimensions. Callers repopulate entities. */
export function setRoom(index) {
  G.roomIndex = index;
  room = ROOMS[index];
  map = room.m;
  COLS = map[0].length;
  ROWS = map.length;
  ROOM_W = COLS * TS;
  ROOM_H = ROWS * TS;
}

/**
 * Tile character at a pixel position. Off-map sides and the ceiling are walls;
 * below the room is open, because falling out of the world is a real outcome.
 * Sealing the ceiling matters: without it a wall-jump out of a tall shaft flings
 * Prisma above the camera clamp and she vanishes off-screen for half a second.
 */
export function tileAt(px, py) {
  const c = px >> 4, r = py >> 4;
  if (c < 0 || c >= COLS || r < 0) return '#';
  if (r >= ROWS) return ' ';
  return map[r][c];
}

/** Is this pixel solid *in the given world*? The one world-conditional chokepoint. */
export function solidAt(px, py, world) {
  const t = tileAt(px, py);
  return t === '#' || (t === 'g' && world === DREAM) || (t === 't' && world === NIGHT);
}

/** Spikes only bite in the nightmare; in the dream they are harmless candy. */
export function hazardAt(px, py, world) {
  return tileAt(px, py) === '^' && world === NIGHT;
}

/** Any solid along the vertical segment x=px, y in [y0,y1]. Samples every tile. */
function solidCol(px, y0, y1, world) {
  for (let y = y0; ; y += TS) {
    if (y > y1) y = y1;
    if (solidAt(px, y, world)) return 1;
    if (y >= y1) return 0;
  }
}

/** Any solid along the horizontal segment y=py, x in [x0,x1]. */
function solidRow(py, x0, x1, world) {
  for (let x = x0; ; x += TS) {
    if (x > x1) x = x1;
    if (solidAt(x, py, world)) return 1;
    if (x >= x1) return 0;
  }
}

/**
 * Move an AABB entity {x,y,w,h,vx,vy} against the tile grid, resolving each
 * axis separately so corners never snag. Sets onGround / onWall.
 */
export function moveEntity(e, world) {
  e.onWall = 0;

  e.x += e.vx;
  if (e.vx) {
    const edge = e.vx > 0 ? e.x + e.w : e.x;
    if (solidCol(edge, e.y + 1, e.y + e.h - 1, world)) {
      e.x = e.vx > 0 ? (edge >> 4 << 4) - e.w - 0.01 : (edge >> 4) + 1 << 4;
      e.onWall = e.vx > 0 ? 1 : -1;
      e.vx = 0;
    }
  }

  e.onGround = 0;
  e.y += e.vy;
  if (e.vy) {
    const edge = e.vy > 0 ? e.y + e.h : e.y;
    if (solidRow(edge, e.x + 1, e.x + e.w - 1, world)) {
      e.y = e.vy > 0 ? (edge >> 4 << 4) - e.h - 0.01 : (edge >> 4) + 1 << 4;
      if (e.vy > 0) e.onGround = 1;
      e.vy = 0;
    }
  }
}

/** True if any sample point of the entity's box is on a hazard tile. */
export function onHazard(e, world) {
  return hazardAt(e.x + 2, e.y + e.h - 1, world) ||
         hazardAt(e.x + e.w - 2, e.y + e.h - 1, world) ||
         hazardAt(e.x + e.w / 2, e.y + e.h / 2, world);
}

/** Is there a floor under this point? Used by walkers to turn at ledges. */
export function groundAhead(e, dir, world) {
  return solidAt(e.x + (dir > 0 ? e.w + 2 : -2), e.y + e.h + 2, world);
}

/** Camera: follow the target with a deadzone, clamped inside the room. */
export function updateCamera(target, snap) {
  const wantX = clamp(target.x + target.w / 2 - W / 2, 0, Math.max(0, ROOM_W - W));
  const wantY = clamp(target.y + target.h / 2 - H / 2, 0, Math.max(0, ROOM_H - H));
  if (snap) { G.cam.x = wantX; G.cam.y = wantY; return; }
  G.cam.x += (wantX - G.cam.x) * 0.12;
  G.cam.y += (wantY - G.cam.y) * 0.1;
}
