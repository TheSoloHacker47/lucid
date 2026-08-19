/**
 * Headless checks for the feel-critical numbers (§5.1, §5.2, §5.4).
 *
 * None of the simulation modules touch the DOM, so the whole game can be
 * stepped in Node. This exists so movement tuning is measurable rather than
 * vibes-only: change a constant, run `node test.js`, see what it did to jump
 * height and coyote time.
 */
import { G, TITLE, PLAY, TS } from './src/state.js';
import { player, updatePlayer, spawnPlayer } from './src/player.js';
import { spawnEnemies, updateEnemies, updateParts } from './src/entities.js';
import { updateShift } from './src/shift.js';
import { updateCamera, solidAt } from './src/world.js';
import { DREAM, NIGHT } from './src/state.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  (cond ? pass++ : fail++);
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

function step() {
  G.t++;
  if (G.hitstop > 0) { G.hitstop--; return; }
  updateShift(); updatePlayer(); updateEnemies(); updateParts(); updateCamera(player);
  for (const k in G.key) G.pkey[k] = G.key[k];
}
const hold = (k, v = 1) => { G.key[k] = v; };
const clearKeys = () => { for (const k in G.key) { G.key[k] = 0; G.pkey[k] = 0; } };

function reset() {
  clearKeys();
  G.mode = PLAY; G.world = DREAM; G.hitstop = 0; G.shake = 0;
  G.shiftCd = 0; G.rip = 0; G.parts.length = 0;
  spawnPlayer(); spawnEnemies();
  player.iframes = 0;
  for (let i = 0; i < 30; i++) step();   // settle onto the ground
}

console.log('\n  LUCID — simulation checks\n');

// ── the room itself ──────────────────────────────────────────────────────────
reset();
ok('player spawns on solid ground', player.onGround === 1, `y=${player.y.toFixed(1)}`);
ok('pit 1 is impassable in the dream',    !solidAt(12 * TS + 8, 9 * TS + 8, DREAM));
ok('pit 1 is bridged by thorn at night',   solidAt(12 * TS + 8, 9 * TS + 8, NIGHT));
ok('gummy shelf is solid in the dream',    solidAt(25 * TS + 8, 8 * TS + 8, DREAM));
ok('gummy shelf is gone at night',        !solidAt(25 * TS + 8, 8 * TS + 8, NIGHT));

// ── run (§5.1: 2.2 px/f, reached in 4 frames) ────────────────────────────────
reset();
hold('r');
for (let i = 0; i < 4; i++) step();
ok('run reaches top speed in 4 frames', near(Math.abs(player.vx), 2.2, 0.01), `vx=${player.vx.toFixed(2)}`);
clearKeys();

// ── jump height, tapped vs held (variable height must actually vary) ─────────
function jumpHeight(holdJump) {
  reset();
  const y0 = player.y;
  hold('j'); step(); if (!holdJump) hold('j', 0);
  let peak = y0;
  for (let i = 0; i < 120; i++) { if (holdJump && player.vy > 0) hold('j', 0); step(); peak = Math.min(peak, player.y); }
  clearKeys();
  return y0 - peak;
}
const tapH = jumpHeight(false), holdH = jumpHeight(true);
ok('tapped jump clears one tile', tapH > TS, `${tapH.toFixed(1)}px`);
ok('held jump goes markedly higher', holdH > tapH * 1.5, `tap ${tapH.toFixed(1)} vs hold ${holdH.toFixed(1)}`);
ok('held jump clears 3 tiles', holdH > TS * 3, `${holdH.toFixed(1)}px`);

// ── coyote time (§5.1: 6 frames of grace after leaving a ledge) ──────────────
reset();
// walk off the right edge of the starting plateau
hold('r');
while (player.onGround && player.x < 20 * TS) step();
clearKeys();
const airFrames = 3;                       // well inside the 6-frame window
for (let i = 0; i < airFrames; i++) step();
const yBefore = player.y;
hold('j'); step(); clearKeys();
ok('coyote time lets a late jump fire', player.vy < 0, `vy=${player.vy.toFixed(2)}`);

// ── coyote time expires ──────────────────────────────────────────────────────
reset();
hold('r');
while (player.onGround && player.x < 20 * TS) step();
clearKeys();
for (let i = 0; i < 12; i++) step();       // well past the 6-frame window
hold('j'); step(); clearKeys();
ok('coyote time expires', player.vy > 0, `vy=${player.vy.toFixed(2)}`);

// ── jump buffer: a press 3 frames BEFORE landing still jumps on touchdown ────
reset();
hold('j'); step(); clearKeys();            // hop up off the plateau
let air = 0;
while (!player.onGround && air < 200) { step(); air++; }
ok('the hop landed again', player.onGround === 1, `${air}f airborne`);

reset();
player.y -= 34; player.vy = 0; player.onGround = 0;   // drop from a height
let toLand = 0;
while (!player.onGround && toLand < 120) { step(); toLand++; }
ok('falls back to the ground', player.onGround === 1 && toLand > 4, `after ${toLand}f`);

// Repeat the drop, but press jump while still 3 frames from touchdown.
reset();
player.y -= 34; player.vy = 0; player.onGround = 0;
for (let i = 0; i < toLand - 3; i++) step();
ok('still airborne just before the buffered press', !player.onGround);
hold('j'); step(); clearKeys();            // press early: should be queued
for (let i = 0; i < 4; i++) step();
ok('jump buffer fires the queued jump on landing', player.vy < 0, `vy=${player.vy.toFixed(2)}`);

// ── the dream shift (§5.4) ───────────────────────────────────────────────────
reset();
const w0 = G.world;
hold('s'); step(); clearKeys();
ok('shift flips the world', G.world !== w0);
ok('shift starts the ripple', G.rip > 0, `rip=${G.rip}`);
ok('shift grants i-frames', player.iframes > 0, `${player.iframes}f`);
const w1 = G.world;
hold('s'); step(); clearKeys();
ok('shift is on cooldown', G.world === w1, `cd=${G.shiftCd}`);
for (let i = 0; i < 95; i++) step();
hold('s'); step(); clearKeys();
ok('shift works again after the cooldown', G.world !== w1);

// ── crossing pit 1 REQUIRES the nightmare ────────────────────────────────────
reset();
let crossed = 0;
hold('r');
for (let i = 0; i < 300; i++) { step(); if (player.x > 16 * TS) { crossed = 1; break; } }
clearKeys();
ok('running right in the dream cannot cross pit 1', !crossed, `reached x=${player.x.toFixed(0)}`);

reset();
hold('s'); step(); clearKeys();            // into the nightmare
for (let i = 0; i < 20; i++) step();
crossed = 0;
hold('r');
for (let i = 0; i < 400; i++) { step(); if (player.x > 16 * TS) { crossed = 1; break; } }
clearKeys();
ok('the thorn root carries you across at night', crossed, `x=${player.x.toFixed(0)}`);

// ── combat: strike, hitstop, pogo ────────────────────────────────────────────
reset();
const before = G.ents.length;
// teleport next to the meadow gloomling and swing
const target = G.ents.find((e) => e.x > 16 * TS && e.x < 20 * TS);
ok('gloomlings spawned from the room string', G.ents.length === 2, `${G.ents.length}`);
if (target) {
  player.x = target.x - 8; player.y = target.y;
  player.face = 1;
  hold('a'); step(); clearKeys();
  ok('horn strike damages the gloomling', target.dmg > 0 || !G.ents.includes(target), `dmg=${target.dmg}`);
  ok('landed strike triggers hitstop', G.hitstop > 0, `${G.hitstop}f`);
}

// pogo: down + strike while airborne bounces off an enemy, and must NOT also
// cost a segment — you are landing on the thing you just hit.
reset();
const t2 = G.ents.find((e) => e.x > 16 * TS);
if (t2) {
  player.x = t2.x; player.y = t2.y - 14;
  player.vy = 2; player.onGround = 0; player.iframes = 0;
  hold('d'); hold('a'); step(); clearKeys();
  ok('pogo bounces at the tuned velocity', near(player.vy, -4.2, 0.01), `vy=${player.vy.toFixed(2)}`);
  ok('pogo does not also cost a segment', G.seg === 7, `seg=${G.seg}`);
}

// pogo off spikes too (§5.2)
reset();
hold('s'); step(); clearKeys();            // spikes only exist at night
for (let i = 0; i < 20; i++) step();
player.x = 20 * TS; player.y = 8 * TS - 20;
player.vy = 2; player.onGround = 0; player.iframes = 0;
hold('d'); hold('a'); step(); clearKeys();
ok('down-strike pogos off spikes', near(player.vy, -4.2, 0.01), `vy=${player.vy.toFixed(2)}`);

// ── damage and the rainbow gauge (§5.3) ──────────────────────────────────────
reset();
player.iframes = 0;
const seg0 = G.seg;
const e0 = G.ents[0];
player.x = e0.x; player.y = e0.y;
step();
ok('contact costs one rainbow segment', G.seg === seg0 - 1, `${seg0} -> ${G.seg}`);
ok('a hit grants i-frames', player.iframes > 0);

// spikes are lethal only at night — both halves of the rule matter
reset();
player.iframes = 0;
player.x = 20 * TS; player.y = 8 * TS; player.vy = 1;
for (let i = 0; i < 8; i++) step();
ok('spikes are harmless candy in the dream', G.seg === 7, `seg=${G.seg}`);

reset();
hold('s'); step(); clearKeys();
for (let i = 0; i < 20; i++) step();
player.iframes = 0;
player.x = 20 * TS; player.y = 8 * TS; player.vy = 1;
for (let i = 0; i < 8; i++) step();
ok('the same spikes bite in the nightmare', G.seg < 7, `seg=${G.seg}`);

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
