/**
 * The Dream Shift (§5.4) — the game's whole hook.
 *
 * Flipping G.world is one line. Everything expensive about this mechanic lives
 * in render.js, which must be able to draw the ENTIRE scene for an arbitrary
 * world so the ripple can composite two of them in a single frame (§8.2).
 */
import { G, DREAM, NIGHT } from './state.js';
import { sfx } from './audio.js';

export const SHIFT_CD = 90;   // 1.5s at 60fps
export const RIPPLE = 15;     // frames the ripple takes to sweep the screen
export const SHIFT_IFRAMES = 8;

/** Attempt a shift. Returns true if it actually happened. */
export function doShift(player) {
  if (G.shiftCd > 0) return 0;

  G.world = G.world === DREAM ? NIGHT : DREAM;
  G.shiftCd = SHIFT_CD;

  // The ripple expands from Prisma, in world coordinates so it tracks the camera.
  G.rip = RIPPLE;
  G.ripX = player.x + player.w / 2;
  G.ripY = player.y + player.h / 2;

  // A skilled panic button: a few invulnerable frames, paid for by the cooldown.
  if (player.iframes < SHIFT_IFRAMES) player.iframes = SHIFT_IFRAMES;

  sfx.shift();
  return 1;
}

export function updateShift() {
  if (G.shiftCd > 0) G.shiftCd--;
  if (G.rip > 0) G.rip--;
}
