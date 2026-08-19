/**
 * Enemies and particles (§6).
 *
 * Every archetype is a row of data plus a shared behaviour: the dream form
 * teaches a pattern gently, the nightmare form weaponises the same pattern.
 * That is why six archetypes buy twelve enemies' worth of variety.
 */
import { G, TS, rr, rnd, hits } from './state.js';
import { ROOM, BESTIARY, ROYGBIV, PAL } from './data.js';
import { moveEntity } from './world.js';
import { player, attackBox, onStrikeLanded, hurt } from './player.js';

const GRAV = 0.24;

/** Read the stat row for an enemy in the world it is currently standing in. */
export const form = (e) => BESTIARY[e.k][G.world ? 'n' : 'd'];

/** Scan the room string for enemy letters and populate G.ents. */
export function spawnEnemies() {
  G.ents.length = 0;
  for (let r = 0; r < ROOM.length; r++)
    for (let c = 0; c < ROOM[r].length; c++) {
      const ch = ROOM[r][c];
      if (BESTIARY[ch]) {
        const b = BESTIARY[ch];
        G.ents.push({
          k: ch,
          x: c * TS + (TS - b.w) / 2, y: r * TS + (TS - b.h),
          w: b.w, h: b.h,
          vx: 0, vy: 0,
          dmg: 0,          // damage taken so far; compared against the CURRENT form's hp
          timer: (r * 7 + c) % 40,
          flash: 0,
          hurtCd: 0,       // stops one swing from hitting twice
        });
      }
    }
}

export function updateEnemies() {
  const box = attackBox();

  for (let i = G.ents.length; i--;) {
    const e = G.ents[i], f = form(e);

    // Shifting can finish a wounded enemy: its fragile form has less HP than
    // the damage it has already taken. "Hurt it here, kill it there."
    if (f.hp && e.dmg >= f.hp) { kill(e); G.ents.splice(i, 1); continue; }

    // --- behaviour: hop toward the player, lunge if this form is a lunger ---
    e.vy = Math.min(e.vy + GRAV, 6);
    if (e.onGround) {
      e.vx *= 0.8;
      if (--e.timer <= 0) {
        e.timer = f.hop;
        const dir = player.x > e.x ? 1 : -1;
        const close = Math.abs(player.x - e.x) < 60;
        e.vx = f.spd * dir * (f.lunge && close ? 1.8 : 1);
        e.vy = -f.jump;
      }
    }
    moveEntity(e, G.world);
    if (e.flash > 0) e.flash--;
    if (e.hurtCd > 0) e.hurtCd--;

    // --- taking a hit from the horn ---
    // Connecting with the horn also protects Prisma from this enemy's contact
    // damage for the frame, so a pogo bounce can't simultaneously cost a
    // segment — you are landing ON the enemy, which is the whole point.
    let struck = 0;
    if (box && !e.hurtCd && hits(box, e)) {
      struck = 1;
      if (f.hp === 0) {
        // Invulnerable in this world — the strike bounces (still pogo-able).
        onStrikeLanded(e.x);
        e.flash = 2;
        e.hurtCd = 10;
      } else {
        e.dmg++;
        e.flash = 3;
        e.hurtCd = 10;
        e.vx = (e.x < player.x ? -1 : 1) * 2.4;   // 4-hit knockback
        e.vy = -1.2;
        onStrikeLanded(e.x);
        spawnParts(e.x + e.w / 2, e.y + e.h / 2, 4, 3);
        if (e.dmg >= f.hp) { kill(e); G.ents.splice(i, 1); continue; }
      }
    }

    // --- contact damage ---
    if (!struck && hits(player, e)) hurt(e.x + e.w / 2);
  }
}

function kill(e) {
  G.shake = 3;
  spawnParts(e.x + e.w / 2, e.y + e.h / 2, 10, -1);
}

/**
 * Particles: 4-8 squares per event (§5.5). `col` picks a ROYGBIV index, or -1
 * for "random rainbow" — kills in the nightmare visibly bleed colour back.
 */
export function spawnParts(x, y, n, col) {
  for (let i = 0; i < n; i++)
    G.parts.push({
      x, y,
      vx: rr(-1.6, 1.6), vy: rr(-2.2, 0.6),
      life: rr(16, 34),
      c: ROYGBIV[col < 0 ? (rnd() * 7 | 0) : Math.max(0, col)],
      s: rr(1, 2.4),
    });
  if (G.parts.length > 120) G.parts.splice(0, G.parts.length - 120);
}

export function updateParts() {
  for (let i = G.parts.length; i--;) {
    const p = G.parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.vx *= 0.98;
    if (--p.life <= 0) G.parts.splice(i, 1);
  }
}
