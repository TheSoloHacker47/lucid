/**
 * Static game data: palettes, level strings, enemy stat table, shard table.
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
 * The seven Rainbow Shards (§2.3). Index doubles as the bit in G.shards and as
 * the ROYGBIV colour, so "which ability do I have" and "how much of the rainbow
 * have I reassembled" are the same question — which is the story's whole point.
 */
export const RED = 0, ORANGE = 1, YELLOW = 2, GREEN = 3, BLUE = 4, INDIGO = 5, VIOLET = 6;
export const SHARD_NAME = ['DREAM SHIFT', 'WALL CLING', 'HORN DASH', 'RAINBOW BURST', 'PRISM SHOT', 'DOUBLE JUMP', 'THE LAST COLOUR'];

/**
 * Room maps. One string per row; ONE map encodes BOTH worlds (§8.5):
 *
 *   terrain   '#' solid in both   't' thorn root, nightmare only
 *             'g' gummy shelf, dream only    '^' spikes, nightmare only
 *   spawns    'P' player   'K' Foalkeeper lantern   'N' Nimbus / The Ram
 *             '*' the First Rift   'R' red shard   'B' boss   'E' end of slice
 *   enemies   'G' gloomling  'C' carousel pony  'W' cotton wisp  'T' gumdrop turret
 *
 * `l` / `r` are the room indices reached by walking off that edge.
 * `h` are floating hint captions, as [tileX, tileY, text].
 */
export const ROOMS = [
  { // meadow-wake
    m: [
      '                              ',
      '                              ',
      '                              ',
      '                              ',
      '                              ',
      '                              ',
      '                      G       ',
      '                    ######    ',
      '  P         G                 ',
      '##############################',
      '##############################',
      '##############################',
    ],
    r: 1,
    h: [[4, 6, '←→ run'], [10, 5, 'Z jump'], [15, 6, 'X horn']],
  },
  { // first-rift
    m: [
      '                                    ',
      '                                    ',
      '                                    ',
      '                                    ',
      '                                    ',
      '                                    ',
      '                                    ',
      '                                    ',
      '      N    *                R       ',
      '##############tttttttt##############',
      '##############        ##############',
      '##############        ##############',
    ],
    l: 0, r: 2,
    h: [[11, 6, 'touch the rift']],
  },
  { // lantern-meadow
    m: [
      '                                ',
      '                                ',
      '                                ',
      '                                ',
      '                                ',
      '                                ',
      '              gg                ',
      '        tt              tt      ',
      '  K                 W           ',
      '######                    ######',
      '######  ^^^^^^^^^^^^^^^^  ######',
      '################################',
    ],
    l: 1, r: 3,
    h: [[3, 6, 'rest here'], [16, 4, 'the dream road is low']],
  },
  { // hollow-a
    m: [
      '                                    ',
      '                                    ',
      '                                    ',
      '                                    ',
      '                  tttt              ',
      '                                    ',
      '        gggg                gggg    ',
      '                                    ',
      '         W                T         ',
      '######      ######      ############',
      '######      ######      ############',
      '######      ######      ############',
    ],
    l: 2, r: 4,
    h: [[9, 3, 'candy hollow']],
  },
  { // hollow-b
    m: [
      '                              ',
      '                              ',
      '                              ',
      '                              ',
      '                              ',
      '                              ',
      '                              ',
      '              gg              ',
      '  K       C      ^^^     C    ',
      '##############################',
      '##############################',
      '##############################',
    ],
    l: 3, r: 5,
    h: [[10, 5, 'she blocks head-on']],
  },
  { // boss-saccharine
    m: [
      '                          ',
      '                          ',
      '                          ',
      '                          ',
      '                          ',
      '                          ',
      '                          ',
      '                          ',
      '    ^^      B       ^^    ',
      '##########################',
      '##########################',
      '##########################',
    ],
    l: 4, r: 6,
  },
  { // chimney
    m: [
      '                        ',
      '                        ',
      '               ##       ',
      '               ##    E  ',
      '               ##  #####',
      '               ##  #####',
      '               ##  #####',
      '               ##  #####',
      '               ##  #####',
      '               ##  #####',
      '                   #####',
      '########################',
    ],
    l: 5,
    h: [[4, 9, 'hold toward the wall']],
  },
];

/**
 * Bestiary (§6). One spec = two enemies: each archetype carries a `d` (dream)
 * and `n` (nightmare) stat row over one shared behaviour, so the dream form
 * teaches a pattern gently and the nightmare form weaponises it.
 *
 *   hp 0     invulnerable in that world
 *   front    blocks head-on; only hittable from behind or above
 *   charge   rushes when horizontally aligned with Prisma
 *   shoot    frames between shots        arc  the shot falls under gravity
 *   heal     dying drops a segment back
 */
export const BESTIARY = {
  // Puffball that hops at you -> lunging spikeball.
  G: {
    w: 10, h: 10, b: 'hop',
    d: { hp: 2, spd: 0.9, hop: 56, jump: 2.6 },
    n: { hp: 3, spd: 1.5, hop: 34, jump: 3.2, lunge: 1 },
  },
  // Wooden pony on a pole that shields itself -> skeletal charger.
  C: {
    w: 14, h: 14, b: 'walk',
    d: { hp: 4, spd: 0.45, front: 1 },
    n: { hp: 3, spd: 0.8, charge: 1 },
  },
  // Drifting cotton -> wailing wisp that spits tracking sparks.
  W: {
    w: 9, h: 9, b: 'fly',
    d: { hp: 1, spd: 0.34, heal: 1 },
    n: { hp: 2, spd: 0.5, shoot: 120 },
  },
  // Spits pogo-able gumdrops -> dormant stone, safe to walk past.
  T: {
    w: 12, h: 12, b: 'still',
    d: { hp: 3, shoot: 90, arc: 1 },
    n: { hp: 0 },
  },
};
