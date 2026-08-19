/**
 * All drawing (§8). There are no image files anywhere in this game: every
 * pixel is Canvas 2D paths, rects and arcs, which compresses far better than
 * any sprite sheet would.
 *
 * THE ONE STRUCTURAL RULE: drawScene(world) must be able to render the whole
 * scene for an ARBITRARY world, because the shift ripple calls it twice in a
 * single frame and clips the second call to an expanding circle (§8.2). No
 * draw function may read G.world directly — it takes the world as a parameter.
 */
import { G, W, H, TS, DREAM, NIGHT, clamp, rnd } from './state.js';
import { PAL, ROOM, ROYGBIV, HINTS } from './data.js';
import { COLS, ROWS } from './world.js';
import { player, ATK_REACH } from './player.js';
import { form } from './entities.js';
import { SHIFT_CD, RIPPLE } from './shift.js';
import { isMuted } from './audio.js';

let ctx;
let shakeX = 0, shakeY = 0;
const grads = [];

export function setCtx(c) { ctx = c; }

/** Is this tile character solid in the given world? (mirrors world.solidAt) */
const solidCh = (t, w) => t === '#' || (t === 'g' && w === DREAM) || (t === 't' && w === NIGHT);

const sky = (w) => {
  if (!grads[w]) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PAL[w].sky[0]);
    g.addColorStop(1, PAL[w].sky[1]);
    grads[w] = g;
  }
  return grads[w];
};

// ─── top level ───────────────────────────────────────────────────────────────

export function drawFrame() {
  // Screenshake is computed once so both halves of a ripple shake together.
  shakeX = G.shake > 0.3 ? (rnd() * 2 - 1) * G.shake : 0;
  shakeY = G.shake > 0.3 ? (rnd() * 2 - 1) * G.shake : 0;

  if (G.rip > 0) {
    const prev = G.world === DREAM ? NIGHT : DREAM;
    const r = (1 - G.rip / RIPPLE) * 420;
    const sx = G.ripX - G.cam.x + shakeX, sy = G.ripY - G.cam.y + shakeY;

    drawScene(prev);                       // the world we are leaving
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, 7);
    ctx.clip();
    drawScene(G.world);                    // the world sweeping in behind it
    ctx.restore();

    // The leading edge of the shockwave, brightest at the moment of the shift.
    ctx.globalAlpha = 0.35 + 0.65 * (G.rip / RIPPLE);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    drawScene(G.world);
  }

  if (G.dead) {
    // Grayscale death dissolve (§5.3): a 'saturation' blend drains the frame.
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,' + (1 - G.dead / 90) * 0.7 + ')';
    ctx.fillRect(0, 0, W, H);
  }

  drawUI();
}

function drawScene(w) {
  const P = PAL[w];

  ctx.fillStyle = sky(w);
  ctx.fillRect(0, 0, W, H);
  drawRainbow(w);
  drawHills(w);
  drawNear(w);

  ctx.save();
  ctx.translate(-(G.cam.x | 0) + shakeX, -(G.cam.y | 0) + shakeY);
  drawTiles(w);
  drawHints(w);
  for (const e of G.ents) drawEnemy(e, w);
  drawPrisma(w);
  drawParts();
  ctx.restore();

  if (P.fog) { ctx.fillStyle = P.fog; ctx.fillRect(0, 0, W, H); }
}

// ─── backgrounds ─────────────────────────────────────────────────────────────

/** The Great Rainbow, arcing behind everything — in the nightmare it is a chain of bones. */
function drawRainbow(w) {
  const ox = 150 - G.cam.x * 0.2;
  ctx.lineWidth = 4;
  if (w) ctx.setLineDash([5, 8]);
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = w ? (i & 1 ? '#2b2145' : '#372a58') : ROYGBIV[i];
    ctx.globalAlpha = w ? 0.6 : 0.34;
    ctx.beginPath();
    ctx.arc(ox, 196, 104 - i * 4.5, Math.PI, 0);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** Far parallax (0.3x): rolling hills in the dream, jagged spires in the nightmare. */
function drawHills(w) {
  ctx.fillStyle = PAL[w].far;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const wx = x + G.cam.x * 0.3;
    const y = w
      ? 132 - Math.abs(Math.sin(wx * 0.019)) * 34 - Math.abs(Math.sin(wx * 0.047)) * 12
      : 128 + Math.sin(wx * 0.013) * 11 + Math.sin(wx * 0.031) * 5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.fill();
}

/** Near parallax (0.6x): clouds in the dream, the same clusters dripping in the nightmare. */
function drawNear(w) {
  ctx.fillStyle = PAL[w].near;
  ctx.globalAlpha = w ? 0.4 : 0.8;
  const span = 128, off = (G.cam.x * 0.6) % span;
  for (let i = -1; i < 4; i++) {
    const x = i * span - off + 20, y = 24 + ((i + 4) % 3) * 17;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, 7);
    ctx.arc(x + 13, y - 4, 9, 0, 7);
    ctx.arc(x + 24, y + 1, 10, 0, 7);
    ctx.fill();
    if (w) {                                   // nightmare: the clouds have run
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + 13, y + 26);
      ctx.lineTo(x + 18, y);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── tiles ───────────────────────────────────────────────────────────────────

function drawTiles(w) {
  const P = PAL[w];
  const c0 = Math.max(0, (G.cam.x / TS | 0) - 1);
  const c1 = Math.min(COLS - 1, (G.cam.x + W) / TS | 0);

  // 1. solid mass
  ctx.fillStyle = P.ground;
  for (let r = 0; r < ROWS; r++)
    for (let c = c0; c <= c1; c++)
      if (ROOM[r][c] === '#') ctx.fillRect(c * TS, r * TS, TS, TS);

  // 2. world-conditional tiles. When a tile belongs to the OTHER world we draw
  //    a faint ghost of it — being able to see where the thorns will land is
  //    what makes shift-platforming readable instead of guesswork.
  for (let r = 0; r < ROWS; r++)
    for (let c = c0; c <= c1; c++) {
      const t = ROOM[r][c], x = c * TS, y = r * TS;
      if (t === 'g') gummy(x, y, w === DREAM);
      else if (t === 't') thorn(x, y, w === NIGHT);
      else if (t === '^') spikes(x, y, w);
    }

  // 3. organic wavy rim on every exposed top edge, so the 16px grid never reads
  //    as a tile grid (§8.5).
  ctx.strokeStyle = P.rim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let r = 0; r < ROWS; r++)
    for (let c = c0; c <= c1; c++) {
      if (!solidCh(ROOM[r][c], w)) continue;
      if (r > 0 && solidCh(ROOM[r - 1][c], w)) continue;
      const x = c * TS, y = r * TS + 1;
      ctx.moveTo(x, y + Math.sin(x * 0.35) * 1.2);
      ctx.quadraticCurveTo(x + 8, y - 2.5 + Math.sin(x * 0.2) * 1.2, x + TS, y + Math.sin((x + TS) * 0.35) * 1.2);
    }
  ctx.stroke();
}

/** Gummy shelf — a wobbling jelly slab that only exists in the dream. */
function gummy(x, y, solid) {
  if (!solid) { ghost(x, y, '#ff9ecb'); return; }
  const wob = Math.sin(G.t * 0.09 + x * 0.1) * 1.1;
  ctx.fillStyle = '#ff9ecb';
  ctx.beginPath();
  ctx.roundRect(x, y + 2 + wob, TS, 12, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 4 + wob, 7, 3, 2);
  ctx.fill();
}

/** Thorn root — barbed growth that only exists in the nightmare. */
function thorn(x, y, solid) {
  if (!solid) { ghost(x, y, '#7a4fd0'); return; }
  ctx.fillStyle = '#3a2b55';
  ctx.fillRect(x, y + 3, TS, 13);
  ctx.fillStyle = '#7a4fd0';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const bx = x + i * 4;
    ctx.moveTo(bx, y + 5);
    ctx.lineTo(bx + 2, y - 1 + Math.sin(bx * 0.7) * 1.5);
    ctx.lineTo(bx + 4, y + 5);
  }
  ctx.fill();
}

/** Spikes: lethal barbs in the nightmare, harmless candy cones in the dream. */
function spikes(x, y, w) {
  ctx.fillStyle = w ? '#d04f7a' : '#ffd36e';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(x + i * 4, y + TS);
    ctx.lineTo(x + i * 4 + 2, y + (w ? 2 : 7));
    ctx.lineTo(x + i * 4 + 4, y + TS);
  }
  ctx.fill();
}

/** A faint outline of geometry that exists in the other world. */
function ghost(x, y, col) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 4, TS - 2, 10);
  ctx.restore();
}

function drawHints(w) {
  ctx.fillStyle = PAL[w].ink;
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  for (const [c, r, text] of HINTS) {
    ctx.globalAlpha = 0.55 + Math.sin(G.t * 0.05 + c) * 0.15;
    ctx.fillText(text, c * TS + 8, r * TS + Math.sin(G.t * 0.04 + c) * 1.6);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// ─── characters ──────────────────────────────────────────────────────────────

function drawEnemy(e, w) {
  const f = form(e);
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2 + Math.sin(G.t * 0.14 + e.x) * 0.6;
  const invuln = f.hp === 0;

  ctx.fillStyle = e.flash ? '#fff' : w ? '#d04f7a' : '#ffd9ee';
  ctx.globalAlpha = invuln ? 0.55 : 1;
  ctx.beginPath();
  if (w) {
    for (let i = 0; i < 12; i++) {                     // nightmare: spikeball
      const a = i / 12 * 6.283, rad = i & 1 ? e.w / 2 + 3.5 : e.w / 2 - 1;
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
  } else {                                             // dream: puffball
    ctx.arc(cx, cy, e.w / 2, 0, 7);
    ctx.arc(cx - 4, cy - 2.5, 3.2, 0, 7);
    ctx.arc(cx + 4, cy - 2.5, 3.2, 0, 7);
  }
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = w ? '#4fd0c8' : '#6a5a7a';
  ctx.fillRect(cx - 3.2, cy - 1, 1.6, 1.6);
  ctx.fillRect(cx + 1.6, cy - 1, 1.6, 1.6);
}

/**
 * Prisma (§8.3). The three mane ribbons trailing through her recent head
 * positions do most of the character work here for very little code.
 */
function drawPrisma(w) {
  const p = player, P = PAL[w];
  const cx = p.x + p.w / 2, by = p.y + p.h;

  // Blink out while recovering from damage. Deliberately keyed to p.blink and
  // not p.iframes, so the i-frames a shift grants never hide her mid-ripple.
  const hidden = p.blink > 0 && !p.flash && (G.t >> 1 & 1);

  if (!hidden) {
    // --- mane + tail: polylines through the head-position history ---
    const ribbons = w ? ['#9a90b4'] : [P.acc[0], P.acc[1], P.acc[3]];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < ribbons.length; i++) {
      ctx.strokeStyle = ribbons[i];
      ctx.lineWidth = 2.4 - i * 0.6;
      ctx.beginPath();
      for (let j = 0; j < p.trail.length; j++) {
        const t = p.trail[j], k = j / 9;
        const x = t.x - p.face * j * 1.15;
        const y = t.y + i * 1.7 + Math.sin(G.t * 0.18 + j * 0.7 + i * 1.4) * 2.4 * k;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // --- body: squash & stretch sells every state change (§8.4) ---
    let sx = 1, sy = 1;
    if (p.land > 0) { sx = 1.16; sy = 0.86; }
    else if (!p.onGround) { if (p.vy < 0) { sx = 0.9; sy = 1.12; } else { sx = 1.06; sy = 0.94; } }

    ctx.save();
    ctx.translate(cx + (p.atk > 0 ? p.face * 3 : 0), by);   // 3px lunge on strike
    ctx.scale(sx * p.face, sy);

    const body = p.flash ? '#fff' : P.body;
    const runPhase = p.onGround && Math.abs(p.vx) > 0.2 ? G.t * 0.42 : 0;

    // In the nightmare her body is ink-black, so every shape gets a rim light
    // first. Same silhouette in both worlds — the player must always read
    // "that is me" (§4.1) — but she has to be visible to do that.
    const paint = (shape, fill) => {
      ctx.beginPath();
      shape();
      if (P.edge && !p.flash) { ctx.strokeStyle = P.edge; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = fill;
      ctx.fill();
    };

    paint(() => {
      for (let i = 0; i < 4; i++) {
        const lift = runPhase ? Math.max(0, Math.sin(runPhase + i * 1.6)) * 3 : 0;
        ctx.rect(-5 + i * 3.3, -5 - lift, 2, 5 + lift);
      }
    }, p.flash ? '#fff' : P.limb);

    const bob = runPhase ? Math.sin(runPhase * 2) * 0.6 : 0;
    paint(() => ctx.roundRect(-7, -11 - bob, 13, 7, 3), body);
    paint(() => ctx.arc(5, -12.5, 4, 0, 7), body);                 // head
    paint(() => ctx.roundRect(5, -12, 5, 3.4, 1.6), body);         // snout
    const flick = p.idle > 180 ? Math.sin(G.t * 0.5) * 2 : 0;      // ear flick at idle 3s
    paint(() => {
      ctx.moveTo(3, -16); ctx.lineTo(5.5, -15.5); ctx.lineTo(3.6 + flick, -19.5);
    }, body);

    ctx.fillStyle = p.flash ? '#fff' : P.horn;        // horn
    ctx.beginPath();
    ctx.moveTo(6.5, -15.5); ctx.lineTo(9, -15); ctx.lineTo(11.5, -22.5);
    ctx.fill();

    if ((G.t % 190) > 5) {                            // eye, blinks
      ctx.fillStyle = p.flash ? '#fff' : P.ink;
      ctx.fillRect(6, -13.6, 1.4, 1.4);
    }
    ctx.restore();
  }

  // --- the horn strike's crescent (§5.2) ---
  if (p.atk > 0) {
    const ax = cx, ay = p.y + p.h / 2;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    if (w) {
      ctx.strokeStyle = '#c9a6ff';
    } else {
      const g = ctx.createLinearGradient(ax - ATK_REACH, ay - ATK_REACH, ax + ATK_REACH, ay + ATK_REACH);
      for (let i = 0; i < 7; i++) g.addColorStop(i / 6, ROYGBIV[i]);
      ctx.strokeStyle = g;
    }
    ctx.beginPath();
    if (p.atkDown) ctx.arc(ax, ay, ATK_REACH, 0.6, 2.54);
    else if (p.face > 0) ctx.arc(ax, ay, ATK_REACH, -0.95, 0.95);
    else ctx.arc(ax, ay, ATK_REACH, Math.PI - 0.95, Math.PI + 0.95);
    ctx.stroke();
  }

  // --- shift cooldown ring, only while cooling down (§8.6) ---
  if (G.shiftCd > 0) {
    ctx.strokeStyle = P.ink;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, p.y + 6, 12, -1.5708, -1.5708 + 6.283 * (1 - G.shiftCd / SHIFT_CD));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawParts() {
  for (const p of G.parts) {
    ctx.globalAlpha = Math.min(1, p.life / 14);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, p.s, p.s);
  }
  ctx.globalAlpha = 1;
}

// ─── UI ──────────────────────────────────────────────────────────────────────

/** The rainbow gauge: 7 diamonds, health and magic in one resource (§5.3). */
function drawUI() {
  for (let i = 0; i < 7; i++) {
    ctx.save();
    ctx.translate(10 + i * 10, 11);
    ctx.rotate(0.7854);
    if (i < G.seg) {
      ctx.fillStyle = ROYGBIV[i];
      ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-3, -3, 6, 6);
    }
    ctx.restore();
  }
  if (isMuted()) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '6px monospace';
    ctx.fillText('muted', W - 32, 12);
  }
}

/** S01 — the title card: a sleeping foal under one slow rainbow band. */
export function drawTitle() {
  ctx.fillStyle = '#07060c';
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = ROYGBIV[i];
    ctx.globalAlpha = 0.22 + 0.18 * Math.sin(G.t * 0.012 + i * 0.45);
    ctx.beginPath();
    ctx.arc(160, 208, 96 - i * 4, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const breath = 1 + Math.sin(G.t * 0.045) * 0.05;
  ctx.save();
  ctx.translate(160, 122);
  ctx.scale(breath, breath);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 9.5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(-14, -4, 6.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd36e';
  ctx.beginPath();
  ctx.moveTo(-18, -9); ctx.lineTo(-15, -10); ctx.lineTo(-21.5, -18);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('LUCID', 160, 64);
  ctx.fillStyle = '#8a7fa0';
  ctx.font = '7px monospace';
  ctx.fillText('every rainbow casts a shadow', 160, 80);
  ctx.globalAlpha = 0.4 + 0.4 * Math.sin(G.t * 0.06);
  ctx.fillStyle = '#fff';
  ctx.fillText('press any key', 160, 160);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
