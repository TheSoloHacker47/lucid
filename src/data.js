/**
 * Static game data: palettes, level strings, enemy stat table.
 * Strings and flat arrays compress extremely well, so as much of the game as
 * possible is expressed as data rather than code (§8.5, §11.3).
 */

/**
 * The two palettes ARE the game's identity (§8.2). Every draw call reads
 * PAL[G.world] — no draw function ever hardcodes a colour.
 */
export const PAL = [
  { // DREAM
    sky: ['#ffeef8', '#cde7ff'],
    ground: '#f9c8e0',
    rim: '#ff9ecb',
    ink: '#6a5a7a',
    far: '#ffd9ee',
    near: '#ffffff',
    acc: ['#ff9ecb', '#ffd36e', '#9be8a8', '#7fd4ff', '#c49bff'],
    body: '#ffffff',
    limb: '#6a5a7a',
    edge: '',            // no rim light needed against a pastel sky
    horn: '#ffd36e',
    fog: '',
  },
  { // NIGHTMARE
    sky: ['#14101f', '#241a33'],
    ground: '#2c2140',
    rim: '#7a4fd0',
    ink: '#e8e4f0',
    far: '#1d1630',
    near: '#3a2b55',
    acc: ['#7a4fd0', '#d04f7a', '#4fd0c8', '#7a4fd0', '#d04f7a'],
    body: '#1a1428',
    limb: '#4a3f68',
    edge: '#9a8fc0',     // rim light: Prisma must stay readable against the dark
    horn: '#4fd0c8',
    fog: 'rgba(20,10,35,.35)',
  },
];

/** The rainbow gauge colours, left to right (§5.3). Also the game's theme. */
export const ROYGBIV = ['#ff4d4d', '#ff9e3d', '#ffe14d', '#5fd97a', '#4fb8ff', '#5a6cff', '#b366ff'];

/**
 * Cloud Meadow — the Gate A room.
 *
 * One string per row; ONE map encodes BOTH worlds (§8.5):
 *   '#'  solid in both worlds
 *   't'  thorn root  - solid ONLY in the nightmare
 *   'g'  gummy shelf - solid ONLY in the dream
 *   '^'  spikes      - hazardous ONLY in the nightmare (harmless candy in dream)
 *   'P'  player spawn        'G' gloomling spawn
 *
 * The room is built to teach the shift in both directions: the first pit can
 * ONLY be crossed on thorn roots (nightmare), and immediately after it the
 * spikes can ONLY be walked over safely in the dream.
 */
export const ROOM = [
  '                                        ',
  '                                        ',
  '                                        ',
  '                                        ',
  '                                        ',
  '                                   G    ',
  '                                  ####  ',
  '                            gg          ',
  '  P              G ^^^   gg             ',
  '##########tttttt########      ##########',
  '##########      ########      ##########',
  '##########      ########      ##########',
];

/** Floating tutorial prompts (§S03), as [tileX, tileY, text]. */
export const HINTS = [
  [3, 6, '←→ run'],
  [6, 6, 'Z jump'],
  [8, 7, 'X horn'],
  [11, 6, 'S shift'],
  [20, 6, 'safe in dream'],
];

/**
 * Bestiary (§6). One spec = two enemies: each archetype carries a `d` (dream)
 * and `n` (nightmare) stat row, and shares a single behaviour function.
 * hp 0 means invulnerable in that world.
 */
export const BESTIARY = {
  // Gloomling: harmless-ish puffball that hops at you -> lunging spikeball.
  G: {
    w: 10, h: 10,
    d: { hp: 2, spd: 0.9, hop: 56, jump: 2.6, lunge: 0 },
    n: { hp: 3, spd: 1.5, hop: 34, jump: 3.2, lunge: 1 },
  },
};
