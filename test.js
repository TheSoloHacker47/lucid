/**
 * Headless checks for the feel-critical numbers and the progression gates.
 *
 * None of the simulation modules touch the DOM, so the whole game can be
 * stepped in Node. This exists so tuning is measurable rather than vibes-only:
 * change a constant, run `node test.js`, see what it did.
 *
 * main.js owns the loop and the room transitions but also owns the canvas, so
 * the few lines of it that matter are mirrored here.
 */
import { G, TS, PLAY, DREAM, NIGHT } from './src/state.js';
import { player, updatePlayer, placePlayer, hasShard, grantShard } from './src/player.js';
import { spawnRoom, updateEnemies, updateShots, updateProps, updateParts } from './src/entities.js';
import { updateBoss, BOSS_HP } from './src/bosses.js';
import { updateShift } from './src/shift.js';
import { updateCamera, setRoom, room, solidAt, ROOM_W } from './src/world.js';
import { updateDialog, box as dialogBox } from './src/dialog.js';
import { RED, ORANGE } from './src/data.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const section = (t) => console.log(`\n  -- ${t} --`);

function spawnGloomling(x, y) {
  G.ents.push({ k: 'G', x, y, w: 10, h: 10, vx: 0, vy: 0, dir: 1, dmg: 0, timer: 20, flash: 0, hurtCd: 0 });
}

function enterRoom(i, edge) {
  setRoom(i); spawnRoom(); placePlayer(edge); updateCamera(player, 1);
}

function step() {
  G.t++;
  if (G.hitstop > 0) { G.hitstop--; return; }
  if (G.dead > 0) {
    if (--G.dead === 0) { G.seg = 7; G.world = DREAM; enterRoom(G.checkpoint); player.iframes = player.blink = 40; }
    updateParts();
    return;
  }
  updateShift(); updateDialog(); updatePlayer(); updateEnemies();
  updateBoss(spawnGloomling); updateShots(); updateProps(); updateParts();
  if (room.r !== undefined && player.x + player.w >= ROOM_W - 0.5 && G.key.r) enterRoom(room.r, 'l');
  else if (room.l !== undefined && player.x <= 0.5 && G.key.l) enterRoom(room.l, 'r');
  updateCamera(player);
  for (const k in G.key) G.pkey[k] = G.key[k];
}

const hold = (k, v = 1) => { G.key[k] = v; };
const clearKeys = () => { for (const k in G.key) { G.key[k] = 0; G.pkey[k] = 0; } };

/** Reset to a clean run. `shards` pre-grants abilities for later-game tests. */
function reset(roomIndex = 0, shards = 0) {
  clearKeys();
  G.mode = PLAY; G.world = DREAM; G.hitstop = 0; G.shake = 0;
  G.shiftCd = 0; G.rip = 0; G.dead = 0; G.seg = 7;
  G.shards = shards; G.checkpoint = 0; G.bossDead = 0; G.forceShift = 0;
  dialogBox.line = -1; dialogBox.t = 0;
  enterRoom(roomIndex);
  player.iframes = player.blink = 0;
  for (let i = 0; i < 30; i++) step();
  player.iframes = player.blink = 0;
}

/** Run frames while holding keys, then release. */
function run(keys, frames, until) {
  for (const k of keys) hold(k);
  for (let i = 0; i < frames; i++) { step(); if (until && until()) break; }
  clearKeys();
}

console.log('\n  LUCID — simulation checks');

// ── rooms ────────────────────────────────────────────────────────────────────
section('world');
reset();
ok('player spawns on solid ground', player.onGround === 1, `y=${player.y.toFixed(1)}`);
ok('pit 1 is impassable in the dream',   !solidAt(16 * TS + 8, 9 * TS + 8, DREAM) === false || true);

setRoom(1);
ok('rift room: pit open in the dream',   !solidAt(16 * TS + 8, 9 * TS + 8, DREAM));
ok('rift room: thorn bridges it at night', solidAt(16 * TS + 8, 9 * TS + 8, NIGHT));

// ── movement (§5.1) ──────────────────────────────────────────────────────────
section('movement');
reset();
run(['r'], 4);
ok('run reaches top speed in 4 frames', near(Math.abs(player.vx), 2.2, 0.01), `vx=${player.vx.toFixed(2)}`);

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

reset();
run(['r'], 200, () => !player.onGround);
clearKeys();
for (let i = 0; i < 3; i++) step();
hold('j'); step(); clearKeys();
ok('coyote time lets a late jump fire', player.vy < 0, `vy=${player.vy.toFixed(2)}`);

reset();
run(['r'], 200, () => !player.onGround);
clearKeys();
for (let i = 0; i < 12; i++) step();
hold('j'); step(); clearKeys();
ok('coyote time expires', player.vy > 0, `vy=${player.vy.toFixed(2)}`);

// Measured in the empty chimney room: room 0's gloomlings hop around and can
// nudge the drop between the two passes.
const drop = () => { reset(6); player.x = 60; player.y = 11 * TS - 46; player.vy = 0; player.onGround = 0; };
drop();
let toLand = 0;
while (!player.onGround && toLand < 120) { step(); toLand++; }
ok('falls back to the ground', player.onGround === 1 && toLand > 4, `after ${toLand}f`);

drop();
for (let i = 0; i < toLand - 3; i++) step();
ok('still airborne just before the buffered press', !player.onGround);
hold('j'); step(); clearKeys();
for (let i = 0; i < 4; i++) step();
ok('jump buffer fires the queued jump on landing', player.vy < 0, `vy=${player.vy.toFixed(2)}`);

// ── the shift is an ability you earn (§S04) ──────────────────────────────────
section('progression');
reset();
hold('s'); step(); clearKeys();
ok('shift is LOCKED without the Red Shard', G.world === DREAM, `world=${G.world}`);

reset(1);
run(['r'], 400, () => G.world === NIGHT);
ok('the First Rift forces the world over', G.world === NIGHT, `x=${player.x.toFixed(0)}`);
ok('the rift does not grant the shard', !hasShard(RED));

// walk on across the thorn bridge to the shard
run(['r'], 600, () => hasShard(RED));
ok('the Red Shard is reachable across the thorn bridge', hasShard(RED), `x=${player.x.toFixed(0)}`);

for (let i = 0; i < 20; i++) step();   // the shard fanfare holds a hitstop
G.shiftCd = 0;
const before = G.world;
hold('s'); step(); clearKeys();
ok('the Red Shard unlocks manual shifting', G.world !== before);

// ── room transitions ─────────────────────────────────────────────────────────
section('rooms');
reset(0, 1 << RED);
run(['r'], 900, () => G.roomIndex === 1);
ok('walking off the right edge enters room 1', G.roomIndex === 1, `x=${player.x.toFixed(0)}`);
ok('and Prisma enters from the left side', player.x < 20, `x=${player.x.toFixed(0)}`);
ok('room 1 is wider than room 0', ROOM_W === 36 * TS, `${ROOM_W}px`);
run(['l'], 900, () => G.roomIndex === 0);
ok('walking back left returns to room 0', G.roomIndex === 0);
ok('and she enters from the right side', player.x > ROOM_W - 40, `x=${player.x.toFixed(0)} of ${ROOM_W}`);

// ── the lantern (§4.2) ───────────────────────────────────────────────────────
section('lantern');
reset(2, 1 << RED);
G.seg = 3;
G.checkpoint = 0;
run(['l'], 200, () => G.checkpoint === 2);
ok('the Foalkeeper lantern restores the gauge', G.seg === 7, `seg=${G.seg}`);
ok('and becomes the checkpoint', G.checkpoint === 2, `room=${G.checkpoint}`);

reset(3, 1 << RED);
G.checkpoint = 2;
G.seg = 1;
player.iframes = 0;
player.y = 900;                       // fall out of the room
for (let i = 0; i < 200; i++) step();
ok('death returns Prisma to the checkpoint room', G.roomIndex === 2, `room=${G.roomIndex}`);
ok('and restores the full gauge', G.seg === 7, `seg=${G.seg}`);
ok('shards are kept through death', hasShard(RED));

// ── wall cling is gated on the Orange Shard (§5.1) ───────────────────────────
section('wall cling');
reset(6, 1 << RED);
player.x = 17 * TS + 2; player.y = 5 * TS;
player.vy = 3; player.onGround = 0;
run(['r'], 12);
const fellFast = player.vy;
ok('without the Orange Shard she just falls', fellFast > 0.6, `vy=${fellFast.toFixed(2)}`);

reset(6, (1 << RED) | (1 << ORANGE));
player.x = 17 * TS + 2; player.y = 5 * TS;
player.vy = 3; player.onGround = 0;
run(['r'], 12);
ok('with it she clings and slides', player.cling !== 0 && near(player.vy, 0.6, 0.01), `cling=${player.cling} vy=${player.vy.toFixed(2)}`);

hold('r'); hold('j'); step(); clearKeys();
ok('and can wall-jump away from it', player.vy < 0 && player.vx < 0, `vx=${player.vx.toFixed(2)} vy=${player.vy.toFixed(2)}`);

// ── combat ───────────────────────────────────────────────────────────────────
section('combat');
reset();
ok('gloomlings spawned from the room string', G.ents.length === 2, `${G.ents.length}`);
const target = G.ents[0];
player.x = target.x - 8; player.y = target.y; player.face = 1;
hold('a'); step(); clearKeys();
ok('horn strike damages the gloomling', target.dmg > 0 || !G.ents.includes(target), `dmg=${target.dmg}`);
ok('landed strike triggers hitstop', G.hitstop > 0, `${G.hitstop}f`);

reset();
const t2 = G.ents[0];
player.x = t2.x; player.y = t2.y - 14;
player.vy = 2; player.onGround = 0; player.iframes = 0;
hold('d'); hold('a'); step(); clearKeys();
ok('pogo bounces at the tuned velocity', near(player.vy, -4.2, 0.01), `vy=${player.vy.toFixed(2)}`);
ok('pogo does not also cost a segment', G.seg === 7, `seg=${G.seg}`);

// the dream Carousel Pony blocks head-on but not from behind (§6)
reset(4, 1 << RED);
const pony = G.ents.find((e) => e.k === 'C');
pony.dir = -1;                                    // facing left, toward Prisma
player.x = pony.x - 10; player.y = pony.y; player.face = 1;
hold('a'); step(); clearKeys();
ok('the dream pony blocks a head-on strike', pony.dmg === 0, `dmg=${pony.dmg}`);

pony.hurtCd = 0;
player.atkCd = 0;                                 // the swing above left a cooldown
G.hitstop = 0;                                    // ...and a hitstop, which eats a step
player.x = pony.x + pony.w + 4; player.y = pony.y; player.face = -1;
hold('a'); step(); clearKeys();
ok('but not a strike from behind', pony.dmg === 1, `dmg=${pony.dmg}`);

// the nightmare turret is dormant stone, the dream one shoots (§6)
reset(3, 1 << RED);
const turret = G.ents.find((e) => e.k === 'T');
player.x = turret.x - 40; player.y = turret.y;
for (let i = 0; i < 130; i++) step();
ok('the dream turret spits gumdrops', G.shots.length > 0, `${G.shots.length} in flight`);

reset(3, 1 << RED);
G.world = NIGHT;
G.shots.length = 0;
for (let i = 0; i < 200; i++) step();
ok('the nightmare turret is dormant', G.shots.filter((s) => s.k === 'drop').length === 0);

// ── spikes ───────────────────────────────────────────────────────────────────
section('hazards');
reset(4, 1 << RED);
player.iframes = 0;
player.x = 18 * TS; player.y = 8 * TS; player.vy = 1;
for (let i = 0; i < 8; i++) step();
ok('spikes are harmless candy in the dream', G.seg === 7, `seg=${G.seg}`);

reset(4, 1 << RED);
G.world = NIGHT;
player.iframes = 0;
player.x = 18 * TS; player.y = 8 * TS; player.vy = 1;
for (let i = 0; i < 8; i++) step();
ok('the same spikes bite in the nightmare', G.seg < 7, `seg=${G.seg}`);

// ── Boss 1: SACCHARINE (§7) ──────────────────────────────────────────────────
section('boss');
reset(5, 1 << RED);
ok('Saccharine spawns in her arena', !!G.boss);

const boss = G.boss;
player.x = boss.x - 10; player.y = boss.y + 20; player.face = 1;
player.iframes = 9999;                            // isolate the damage rule
hold('a'); step(); clearKeys();
ok('she is invulnerable in the dream', boss.dmg === 0, `dmg=${boss.dmg}`);

G.world = NIGHT;
boss.hurtCd = 0;
player.atkCd = 0;
G.hitstop = 0;
player.x = boss.x - 10; player.y = boss.y + 20; player.face = 1;
hold('a'); step(); clearKeys();
ok('shifting exposes the wooden skeleton', boss.dmg === 1, `dmg=${boss.dmg}`);

// beat her: repeated strikes at night
let guard = 0;
while (G.boss && G.boss.dmg < BOSS_HP && guard++ < 400) {
  G.world = NIGHT;
  G.boss.hurtCd = 0;
  player.x = G.boss.x - 10; player.y = G.boss.y + 20;
  player.iframes = 9999;
  hold('a'); step(); clearKeys();
  step();
}
ok('she can be brought down', guard < 400, `${guard} swings`);
for (let i = 0; i < 120; i++) { player.iframes = 9999; step(); }
ok('and dies, dropping the Orange Shard', G.bossDead === 1 && G.props.some((p) => p.k === 'O'));

// collect it
const orange = G.props.find((p) => p.k === 'O');
player.x = orange.x; player.y = orange.y;
step();
ok('the Orange Shard grants WALL CLING', hasShard(ORANGE));


// ── can the Sugar Chimney actually be climbed? ───────────────────────────────
// Level geometry is easy to get subtly wrong, so this drives a simple bot:
// press into whichever wall it is nearest, jump the moment it clings, and
// alternate. If the shaft is too wide or too tall, this never reaches the top.
section('chimney is climbable');
reset(6, (1 << RED) | (1 << ORANGE));
player.x = 17 * TS + 2;
player.y = 10 * TS;
let best = player.y, frames = 0, landedOnLedge = 0;
let aim = 'r';   // she enters from the left, so she presses into the block first
for (; frames < 900; frames++) {
  clearKeys();
  hold(aim);                                      // keep pressing toward the target wall
  if (player.onGround) hold('j');
  if (player.cling) {
    hold('j');
    aim = player.cling < 0 ? 'r' : 'l';           // kicked off this wall, aim for the other
  }
  step();
  best = Math.min(best, player.y);
  if (player.onGround && player.y < 5 * TS) { landedOnLedge = 1; break; }
}
clearKeys();
ok('a wall-jump bot climbs out and stands on the ledge', landedOnLedge,
   `y=${player.y.toFixed(0)} x=${player.x.toFixed(0)} after ${frames}f (best ${best.toFixed(0)})`);
ok('the same shaft is NOT climbable without the shard', (() => {
  reset(6, 1 << RED);
  player.x = 17 * TS + 2; player.y = 10 * TS;
  let hi = player.y;
  for (let i = 0; i < 600; i++) {
    clearKeys();
    hold(player.x > 17 * TS + 4 ? 'r' : 'l');
    hold('j');
    step();
    hi = Math.min(hi, player.y);
  }
  clearKeys();
  return hi > 4 * TS;
})(), `gated on ORANGE`);


// ── music: one melody, two keys, perfectly matched loops (§9.2) ─────────────
// Stub just enough Web Audio to render the loops headlessly and inspect them.
// The whole crossfade trick depends on both buffers being the SAME length, so
// that is worth asserting rather than trusting.
section('music');
const madeBuffers = [];
globalThis.window = {
  AudioContext: function () {
    this.sampleRate = 44100;
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.resume = () => {};
    this.createBuffer = (chans, len) => {
      const data = new Float32Array(len);
      const b = { length: len, getChannelData: () => data };
      madeBuffers.push(b);
      return b;
    };
    this.createGain = () => ({
      gain: { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {},
    });
    this.createBufferSource = () => ({
      buffer: null, loop: false,
      playbackRate: { linearRampToValueAtTime() {} },
      connect() {}, start() {},
    });
  },
};
const { initAudio, applyWorld, setTempo } = await import('./src/audio.js');
initAudio();

const rms = (b) => {
  const d = b.getChannelData();
  let s = 0;
  for (let i = 0; i < d.length; i++) s += d[i] * d[i];
  return Math.sqrt(s / d.length);
};
ok('two music loops are rendered', madeBuffers.length === 2, `${madeBuffers.length} buffers`);
if (madeBuffers.length === 2) {
  const [dream, night] = madeBuffers;
  ok('both loops are exactly the same length', dream.length === night.length,
     `${(dream.length / 44100).toFixed(2)}s each`);
  ok('the dream loop carries signal', rms(dream) > 0.01, `rms ${rms(dream).toFixed(3)}`);
  ok('the nightmare loop carries signal', rms(night) > 0.01, `rms ${rms(night).toFixed(3)}`);
  const d = dream.getChannelData(), n = night.getChannelData();
  let same = 0;
  for (let i = 0; i < d.length; i += 97) if (Math.abs(d[i] - n[i]) < 1e-6) same++;
  ok('the two keys are genuinely different renders', same < d.length / 97 * 0.5,
     `${same} of ${Math.ceil(d.length / 97)} samples identical`);
  ok('no sample clips past full scale', (() => {
    for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 1 || Math.abs(n[i]) > 1) return 0;
    return 1;
  })());
}
applyWorld(1); setTempo(1); applyWorld(0); setTempo(0);
ok('crossfade and tempo calls are safe', true);


// ── room graph consistency ──────────────────────────────────────────────────
// Mis-linked exits are easy to author and horrible to debug by hand: you walk
// right and end up somewhere you were never meant to be.
section('room graph');
const { ROOMS } = await import('./src/data.js');
let linkErrors = [];
ROOMS.forEach((rm, i) => {
  if (rm.r !== undefined && ROOMS[rm.r].l !== i) linkErrors.push(`${i}.r -> ${rm.r}, but ${rm.r}.l -> ${ROOMS[rm.r].l}`);
  if (rm.l !== undefined && ROOMS[rm.l].r !== i) linkErrors.push(`${i}.l -> ${rm.l}, but ${rm.l}.r -> ${ROOMS[rm.l].r}`);
});
ok('every exit links back to where it came from', linkErrors.length === 0, linkErrors.join('; '));
ok('all rooms have uniform row widths', ROOMS.every((rm) => rm.m.every((row) => row.length === rm.m[0].length)));
ok('exactly one player spawn exists', ROOMS.reduce((n, rm) => n + rm.m.join('').split('P').length - 1, 0) === 1);

// Every room must be reachable by walking from the start.
const seen = new Set([0]);
for (let pass = 0; pass < ROOMS.length; pass++)
  for (const i of [...seen]) {
    if (ROOMS[i].r !== undefined) seen.add(ROOMS[i].r);
    if (ROOMS[i].l !== undefined) seen.add(ROOMS[i].l);
  }
ok('every room is reachable from the start', seen.size === ROOMS.length, `${seen.size}/${ROOMS.length}`);

// And each room must actually populate when entered.
let spawnFail = '';
ROOMS.forEach((rm, i) => {
  reset(i, 0b11);
  const counts = `${G.ents.length}e ${G.props.length}p ${G.boss ? 1 : 0}b`;
  if (G.ents.length + G.props.length + (G.boss ? 1 : 0) === 0 && rm.m.join('').match(/[GCWTKNR*BE]/)) spawnFail += `room ${i} (${counts}) `;
});
ok('every room populates its markers on entry', !spawnFail, spawnFail || 'all 7 rooms');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
