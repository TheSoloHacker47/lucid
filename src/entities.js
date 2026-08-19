/**
 * Enemies, projectiles, props and particles (§6).
 *
 * Every archetype is a row of data plus one shared behaviour: the dream form
 * teaches a pattern gently, the nightmare form weaponises the same pattern.
 * That is why four archetypes buy eight enemies' worth of variety.
 */
import { G, TS, DREAM, NIGHT, rr, rnd, hits } from './state.js';
import { BESTIARY, ROYGBIV, RED, ORANGE } from './data.js';
import { NPC_LINES, say } from './dialog.js';
import { map, COLS, ROWS, moveEntity, groundAhead, solidAt } from './world.js';
import { player, attackBox, onStrikeLanded, hurt, heal, hasShard, grantShard } from './player.js';
import { spawnBoss, updateBoss } from './bosses.js';
import { sfx } from './audio.js';

const GRAV = 0.24;

/** Read the stat row for an enemy in the world it is currently standing in. */
export const form = (e) => BESTIARY[e.k][G.world ? 'n' : 'd'];

/** Props are the things you touch rather than fight. */
const PROP_KINDS = 'KNR*BE';

/** Scan the current room string and populate enemies, props and the boss. */
export function spawnRoom() {
  G.ents.length = 0;
  G.props.length = 0;
  G.shots.length = 0;
  G.parts.length = 0;
  G.boss = null;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const ch = map[r][c];
      if (BESTIARY[ch]) {
        const b = BESTIARY[ch];
        G.ents.push({
          k: ch,
          x: c * TS + (TS - b.w) / 2, y: r * TS + (TS - b.h),
          w: b.w, h: b.h,
          vx: 0, vy: 0,
          dir: 1,
          dmg: 0,          // damage taken; compared against the CURRENT form's hp
          timer: (r * 7 + c) % 40,
          flash: 0,
          hurtCd: 0,       // stops one swing from hitting twice
        });
      } else if (PROP_KINDS.includes(ch)) {
        if (ch === 'B') {
          if (!G.bossDead) G.boss = spawnBoss(c * TS, r * TS);
        } else {
          G.props.push({ k: ch, x: c * TS, y: r * TS, w: TS, h: TS, t: 0, gone: 0 });
        }
      }
    }

  // A shard already collected must not sit there a second time.
  for (const p of G.props)
    if (p.k === 'R' && hasShard(RED)) p.gone = 1;
}

/** Drop the Orange Shard where Saccharine fell (§7, Boss 1). */
export function dropShard(x, y) {
  G.props.push({ k: 'O', x, y, w: TS, h: TS, t: 0, gone: 0 });
}

// ─── enemies ─────────────────────────────────────────────────────────────────

export function updateEnemies() {
  const box = attackBox();

  for (let i = G.ents.length; i--;) {
    const e = G.ents[i], f = form(e), b = BESTIARY[e.k];

    // Shifting can finish a wounded enemy: its fragile form has less HP than
    // the damage it has already taken. "Hurt it here, kill it there."
    if (f.hp && e.dmg >= f.hp) { kill(e); G.ents.splice(i, 1); continue; }

    behave(e, f, b);
    if (e.flash > 0) e.flash--;
    if (e.hurtCd > 0) e.hurtCd--;

    // --- taking a hit from the horn ---
    // Connecting with the horn also protects Prisma from this enemy's contact
    // damage for the frame, so a pogo bounce can't simultaneously cost a
    // segment — you are landing ON the enemy, which is the whole point.
    let struck = 0;
    if (box && !e.hurtCd && hits(box, e)) {
      struck = 1;
      // The dream Carousel Pony blocks with her body: only a strike from
      // behind, or a pogo from above, gets past the painted shield.
      const shielded = f.front && !player.atkDown && (player.x - e.x) * e.dir > 0;
      if (f.hp === 0 || shielded) {
        onStrikeLanded(e.x);      // clangs off — still pogo-able
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

    if (!struck && hits(player, e)) hurt(e.x + e.w / 2);
  }
}

function behave(e, f, b) {
  if (b.b === 'fly') {
    // Cotton Wisp: drifts toward Prisma, ignoring gravity.
    e.vx += Math.sign(player.x - e.x) * 0.03;
    e.vy += Math.sign(player.y - e.y) * 0.03;
    e.vx = clampAbs(e.vx, f.spd); e.vy = clampAbs(e.vy, f.spd);
    e.x += e.vx; e.y += e.vy;
    if (f.shoot && --e.timer <= 0) { e.timer = f.shoot; fire(e, 'spark'); }
    return;
  }

  if (b.b === 'still') {
    // Gumdrop Turret: rooted. Dormant stone in the nightmare.
    e.vy = Math.min(e.vy + GRAV, 6);
    moveEntity(e, G.world);
    if (f.shoot && --e.timer <= 0) { e.timer = f.shoot; fire(e, 'drop'); }
    return;
  }

  e.vy = Math.min(e.vy + GRAV, 6);

  if (b.b === 'walk') {
    // Carousel Pony: patrols, turning at walls and ledges. Her nightmare form
    // drops the shield and charges the moment you line up with her.
    const aligned = f.charge && Math.abs(player.y - e.y) < 20 && Math.abs(player.x - e.x) < 110;
    if (aligned) {
      e.dir = player.x > e.x ? 1 : -1;
      e.vx = f.spd * 2.4 * e.dir;
    } else {
      e.vx = f.spd * e.dir;
      if (e.onWall || !groundAhead(e, e.dir, G.world)) e.dir = -e.dir;
    }
    moveEntity(e, G.world);
    return;
  }

  // 'hop' — Gloomling. Sits, then hops toward you; the nightmare form lunges.
  if (e.onGround) {
    e.vx *= 0.8;
    if (--e.timer <= 0) {
      e.timer = f.hop;
      e.dir = player.x > e.x ? 1 : -1;
      const close = Math.abs(player.x - e.x) < 60;
      e.vx = f.spd * e.dir * (f.lunge && close ? 1.8 : 1);
      e.vy = -f.jump;
    }
  }
  moveEntity(e, G.world);
}

const clampAbs = (v, m) => v > m ? m : v < -m ? -m : v;

function kill(e) {
  G.shake = 3;
  spawnParts(e.x + e.w / 2, e.y + e.h / 2, 10, -1);
  // A dream Cotton Wisp pops into a heal-mote (§6) — the only enemy in the
  // slice that rewards you for killing it in the gentler world.
  if (form(e).heal) { heal(1); sfx.mote(); }
}

// ─── projectiles ─────────────────────────────────────────────────────────────

function fire(e, kind) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dx = player.x + 6 - cx, dy = player.y + 6 - cy;
  const d = Math.hypot(dx, dy) || 1;
  G.shots.push(kind === 'drop'
    // Gumdrops arc, which is what makes them pogo-able.
    ? { k: 'drop', x: cx, y: cy, w: 6, h: 6, vx: Math.sign(dx) * 1.5, vy: -2.6, g: 0.12, life: 200 }
    : { k: 'spark', x: cx, y: cy, w: 5, h: 5, vx: dx / d * 1.1, vy: dy / d * 1.1, g: 0, life: 190 });
  sfx.shot();
}

export function updateShots() {
  const box = attackBox();
  for (let i = G.shots.length; i--;) {
    const s = G.shots[i];
    s.vy += s.g;
    // Sparks steer gently toward Prisma; gumdrops just fall.
    if (s.k === 'spark') {
      s.vx += Math.sign(player.x + 6 - s.x) * 0.02;
      s.vy += Math.sign(player.y + 6 - s.y) * 0.02;
    }
    s.x += s.vx; s.y += s.vy;

    let dead = --s.life <= 0 || solidAt(s.x + 3, s.y + 3, G.world);

    // A down-strike pops a projectile and bounces off it (§5.2).
    if (!dead && box && hits(box, s)) {
      onStrikeLanded(s.x);
      spawnParts(s.x, s.y, 5, 2);
      dead = 1;
    } else if (!dead && hits(player, s)) {
      hurt(s.x);
      dead = 1;
    }
    if (dead) G.shots.splice(i, 1);
  }
}

// ─── props: the things you touch rather than fight ───────────────────────────

export function updateProps() {
  for (const p of G.props) {
    p.t++;
    if (p.gone || !hits(player, p)) continue;

    if (p.k === 'N') {
      // Nimbus in the dream, The Ram in the nightmare: same spot, same
      // silhouette, and only together do they tell the truth (§2.2).
      say(NPC_LINES.N[G.world]);
    } else if (p.k === 'K') {
      // The Foalkeeper's lantern: heal, and remember this spot (§4.2).
      if (G.checkpoint !== G.roomIndex || G.seg < 7) {
        G.checkpoint = G.roomIndex;
        G.seg = 7;
        sfx.chime();
        spawnParts(p.x + 8, p.y + 8, 12, -1);
      }
      say(NPC_LINES.K[G.world]);
    } else if (p.k === '*') {
      // The First Rift (§S04): touching it forces the world over ONCE. Without
      // the latch it re-fires every frame you stand on it, flip-flopping the
      // world and dropping you into the pit it just bridged.
      if (!hasShard(RED) && !p.used) { p.used = 1; G.forceShift = 1; say(4); }
    } else if (p.k === 'R') {
      p.gone = 1;
      grantShard(RED);
    } else if (p.k === 'O') {
      p.gone = 1;
      grantShard(ORANGE);
    } else if (p.k === 'E') {
      say(8, 240);
    }
  }
}

// ─── particles ───────────────────────────────────────────────────────────────

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
