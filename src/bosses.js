/**
 * Bosses (§7). Each is a small scripted state machine over the same physics
 * everything else uses.
 *
 * BOSS 1 — SACCHARINE, the Smiling Mare (Candy Hollow).
 * A giant carousel unicorn with a painted-on smile. Her gimmick is the game's
 * thesis in one fight: she is invulnerable in the dream, because her porcelain
 * armour is intact there, so you must shift to the nightmare to reach the
 * wooden skeleton underneath — but the nightmare arena grows floor thorns, so
 * you cannot camp in the world where she is soft.
 */
import { G, NIGHT, rr } from './state.js';
import { moveEntity, ROOM_W } from './world.js';
import { player, attackBox, onStrikeLanded, hurt } from './player.js';
import { spawnParts, dropShard } from './entities.js';
import { say } from './dialog.js';
import { sfx } from './audio.js';
import { hits } from './state.js';

export const BOSS_HP = 10;

// Phases
const GALLOP = 0, WINDUP = 1, STOMP = 2, RECOVER = 3, DYING = 4;

export function spawnBoss(x, y) {
  sfx.roar();
  return {
    x: x - 8, y: y - 26, w: 30, h: 40,
    vx: 0, vy: 0,
    dir: -1,
    dmg: 0,
    state: GALLOP,
    timer: 90,
    flash: 0,
    hurtCd: 0,
    crack: 0,        // how broken the painted smile is, 0..1
    summoned: 0,
  };
}

/** Second phase begins at half health (§7): she summons, and the gallop bounces. */
const enraged = (b) => b.dmg >= BOSS_HP / 2;

export function updateBoss(spawnGloomling) {
  const b = G.boss;
  if (!b) return;

  if (b.state === DYING) {
    // She still collides while collapsing: without this she sinks through the
    // carousel floor and the Orange Shard drops out of the world with her.
    b.vy = Math.min(b.vy + 0.24, 7);
    moveEntity(b, G.world);
    b.timer--;
    if (b.timer % 6 === 0) spawnParts(b.x + rr(0, b.w), b.y + rr(0, b.h), 5, -1);
    if (b.timer <= 0) {
      // Her smile cracks first (§7).
      dropShard(b.x + b.w / 2 - 8, b.y);
      G.boss = null;
      G.bossDead = 1;
      say(7, 200);
    }
    return;
  }

  b.vy = Math.min(b.vy + 0.24, 7);
  b.timer--;

  if (b.state === GALLOP) {
    b.vx = (enraged(b) ? 2.5 : 1.7) * b.dir;
    // Enraged, the gallop becomes a bounce-charge you have to jump twice.
    if (enraged(b) && b.onGround) b.vy = -3.4;
    if (b.x <= 8 || b.x + b.w >= ROOM_W - 8) b.dir = -b.dir;
    if (b.timer <= 0) { b.state = WINDUP; b.timer = 26; b.vx = 0; }
  } else if (b.state === WINDUP) {
    b.vx *= 0.8;
    if (b.timer <= 0) {
      b.state = STOMP;
      b.timer = 40;
      b.vy = -5.2;                       // rears up, then comes down hard
      if (enraged(b) && !b.summoned) {
        b.summoned = 1;
        spawnGloomling(b.x - 20, b.y);
        spawnGloomling(b.x + b.w + 8, b.y);
      }
    }
  } else if (b.state === STOMP) {
    b.vx *= 0.9;
    if (b.onGround && b.vy === 0 && b.timer < 34) {
      G.shake = 6;
      sfx.stomp();
      for (let i = 0; i < 8; i++) spawnParts(b.x + rr(0, b.w), b.y + b.h, 1, -1);
      b.state = RECOVER;
      b.timer = 46;                      // the window where her head is low
    }
  } else if (b.state === RECOVER) {
    b.vx *= 0.85;
    if (b.timer <= 0) { b.state = GALLOP; b.timer = 130; }
  }

  moveEntity(b, G.world);
  if (b.flash > 0) b.flash--;
  if (b.hurtCd > 0) b.hurtCd--;

  // --- damage ---
  // Porcelain in the dream, wood in the nightmare. Her head is the weak point
  // while she recovers from a stomp, which is what makes the pogo matter.
  const box = attackBox();
  if (box && !b.hurtCd && hits(box, b)) {
    if (G.world !== NIGHT) {
      onStrikeLanded(b.x);               // clangs off the armour, still pogo-able
      b.flash = 2;
      b.hurtCd = 12;
      spawnParts(box.x, box.y, 3, 1);
    } else {
      b.dmg++;
      b.flash = 4;
      b.hurtCd = 12;
      b.crack = b.dmg / BOSS_HP;
      G.shake = 5;
      onStrikeLanded(b.x);
      spawnParts(b.x + b.w / 2, b.y + 10, 6, -1);
      if (b.dmg >= BOSS_HP) {
        b.state = DYING;
        b.timer = 70;
        b.vy = -3;
        sfx.roar();
      }
    }
  }

  if (b.state !== DYING && hits(player, b)) hurt(b.x + b.w / 2);
}
