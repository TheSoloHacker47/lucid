# LUCID

**A js13kGames 2026 entry — theme: *Unicorns and Rainbows*.**
*Every rainbow casts a shadow.*

You are **Prisma**, the last unicorn foal, asleep inside her own dying dream. The
pastel dream world and the ash-dark nightmare are not two places — they are one
world seen through two states of mind, and one button flips between them.

The **Dream Shift** is the whole game: platforms, hazards and enemies exist
differently in each world, so shifting is a traversal tool, a combat verb and a
panic button at once. Prisma's health and magic are a single **7-colour rainbow
gauge**, so every heal costs you offence.

> Full design: [`LUCID_GAME_DESIGN_DOC.md`](LUCID_GAME_DESIGN_DOC.md). Section
> numbers referenced throughout the source (§5.1, §8.2, …) point back into it.

---

## Status: Gate B — vertical slice

The design doc builds in four gates (§11.6), each shippable. **Gates A and B are done** — the slice runs from waking in the Cloud Meadow to beating Boss 1 and using her shard.

**Gate A — the playable toy**
- [x] Build pipeline with a hard 13,312-byte gate that fails the build
- [x] Fixed-timestep engine, tile collision, camera, particles, seeded RNG
- [x] Prisma: run, variable-height jump, coyote time, jump buffer
- [x] Horn strike, **pogo** (off enemies, spikes *and* projectiles), hitstop, screenshake
- [x] **Dream Shift** with the two-world ripple composite
- [x] 7-segment rainbow gauge, damage, death dissolve, respawn

**Gate B — the vertical slice**
- [x] Seven linked rooms: Cloud Meadow → the First Rift → Candy Hollow → the carousel
- [x] The shift is **earned**, not given: the First Rift forces it once, the Red Shard grants it
- [x] **Boss 1 — SACCHARINE, the Smiling Mare**: armoured in the dream, exposed in the nightmare
- [x] Shards 1–2: Red (Dream Shift) and Orange (Wall Cling), with a wall-jump gate that uses it
- [x] Foalkeeper lanterns: heal and checkpoint; death keeps your shards
- [x] Four enemy archetypes × two forms: Gloomling, Cotton Wisp, Gumdrop Turret, Carousel Pony
- [x] Enemy projectiles — arcing gumdrops are pogo-able, sparks track you
- [x] Nimbus / The Ram: the twin narrative, same spot, opposite truths
- [x] **Music**: one melody rendered in two keys, crossfaded on every shift
- [ ] Gate C — Acts 2–3, Bosses 2–4, abilities 3–7, both endings
- [ ] Gate D — mobile touch controls, size crunch, submission

## Controls

| Action | Keys | Unlocked by |
|---|---|---|
| Move | `←` `→` / `A` `D` | |
| Jump (hold for height) | `Z` / `W` / `↑` / `Space` | |
| Horn strike | `X` / `J` | |
| Pogo | `↓` + strike, in the air | |
| **Dream Shift** | `S` / `K` | Red Shard |
| Wall cling / wall jump | hold toward a wall, then jump | Orange Shard |
| Mute | `M` | |

Touch controls arrive at Gate D, before the Mobile category is ticked.

## Build

```
npm install
npm run build      # -> dist/index.html + dist/lucid.zip, fails if over budget
npm test           # simulation checks, then the offline check on the built artifact
npm start          # build and serve on :5173
npm run dev        # also emit dist/debug.html and dist/verify.html
```

`dist/lucid.zip` is the submission artifact: one self-contained `index.html`,
no external requests, runs offline from `file://`.

## Byte budget

Tracked every build, as §11.5 requires. The **total** is the real number — the
per-system column is each module's share of the raw bundle, which tracks *what
is growing* rather than its literal share of the compressed zip.

| System | Budget (§11.5) | Raw share now | Status |
|---|---|---|---|
| Engine core (loop, input, camera, collision, particles) | 2.0 KB | 7.5 KB | main + state + world |
| Player (movement, combat, abilities) | 1.6 KB | 5.4 KB | 2 of 6 abilities |
| Shift system + ripple + auto-pulses | 0.7 KB | 0.5 KB | auto-pulses pending |
| Enemies (6 archetypes × 2 forms) | 1.5 KB | 6.5 KB | 4 of 6 archetypes, + projectiles |
| Bosses (3 + mini) | 1.8 KB | 2.8 KB | 1 of 4 |
| Rendering / art | 1.8 KB | 21.5 KB | |
| Levels + entity placement | 1.2 KB | 6.2 KB | 7 of ~18 rooms |
| Audio | 1.6 KB | 4.9 KB | sfx + both music loops |
| Dialogue + story cards + endings | 0.5 KB | 0.9 KB | 9 lines, endings pending |
| HTML/CSS/meta | 0.6 KB | 0.2 KB | |

**Zipped: 9,153 / 13,312 bytes (68.8%) — 4,159 remaining.**

Raw bundle bytes are roughly 5× the zipped result, so the raw column is not
comparable to the budget column directly; it is there to show relative growth.
If the total goes over, the cut order is fixed in advance (§11.6): rooms 18→14,
then enemy archetype 6, then boss P2 variety, then swap `fillText` for a bitmap
font. The shift mechanic, the juice, the true ending and the audio are never cut.

## How it is built

Vanilla JS and Canvas 2D. No engine, no images, no fonts, no network.

```
src/state.js      shared game state, seeded RNG, helpers
src/data.js       palettes, room maps, bestiary, shard table
src/world.js      room loading, world-conditional collision, camera
src/player.js     Prisma: movement, combat, abilities, the rainbow gauge
src/entities.js   enemies, projectiles, props, particles
src/bosses.js     Saccharine
src/shift.js      the Dream Shift
src/dialog.js     the DIALOG array and the textbox
src/render.js     every pixel, procedurally
src/audio.js      a small synth, and the two music loops
src/main.js       boot, input, room transitions, fixed-timestep loop
build.js          esbuild -> terser -> roadroller -> zip -> advzip, with the size gate
test.js           headless simulation checks
offline.js        runs the built artifact against a stub DOM, with no network
```

Three ideas do most of the work:

**One map string encodes both worlds.** A room row like `##########tttttt####`
carries `t` (thorn root, nightmare only) and `g` (gummy shelf, dream only)
alongside `#` (solid in both). Every "is this solid?" question routes through a
single `solidAt(x, y, world)`, so adding a world-conditional tile type is a
one-line change and nothing else can get it wrong.

**The renderer never reads the current world.** `drawScene(world)` takes the
world as a parameter, because the shift ripple draws the world you are leaving,
clips an expanding circle, and draws the world you are entering inside it — two
complete scenes in one frame. Building the renderer any other way would make
the game's signature effect impossible, so that shape was locked in first.

**One spec is two enemies.** Each archetype carries a dream stat row and a
nightmare stat row over one shared behaviour. The dream form teaches a pattern
gently; the nightmare form weaponises it. Six archetypes buy twelve enemies'
worth of variety — and it is also the story's thesis, expressed as code.

**One melody is two songs.** The dream loop and the nightmare loop are the same
sixteen notes: the nightmare flattens the thirds and sixths, drops an octave and
adds a noise bed. Both buffers are the same length and start on the same sample,
so a shift is just a 0.4s crossfade between two gain nodes and lands mid-phrase
without a seam. Boss music is the same two buffers at 1.32× playback rate.

## Notes

- The build emits both a plain-minified and a roadroller-packed zip and ships
  whichever is smaller. Roadroller's decoder costs ~600 bytes, so it only starts
  winning once there is enough code to pay for it — which it now does.
- `state.js` is the one addition to the layout in §11.2: it holds the shared `G`
  object so no module has to import from `main.js`, which would be a cycle.
- Movement constants live at the top of `src/player.js`. Change one, run
  `npm test`, and the jump-height and coyote-time numbers print out.

## Credits

Design, code and art: this repository. Built for
[js13kGames 2026](https://js13kgames.com).
