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

## Status: Gate A — playable toy

The design doc builds in four gates (§11.6), each shippable. **Gate A is done:**

- [x] Build pipeline with a hard 13,312-byte gate that fails the build
- [x] Fixed-timestep engine, tile collision, camera, particles, seeded RNG
- [x] Prisma: run, variable-height jump, coyote time, jump buffer
- [x] Horn strike, **pogo** (off enemies *and* spikes), hitstop, screenshake
- [x] **Dream Shift** with the two-world ripple composite
- [x] Cloud Meadow room with world-conditional tiles, both directions
- [x] Gloomling — one archetype, two forms
- [x] 7-segment rainbow gauge, damage, death dissolve, respawn
- [x] Sound effects
- [ ] Gate B — Candy Hollow, Boss 1, shards 1–2, lanterns, music
- [ ] Gate C — all zones, bosses, abilities, dialogue, both endings
- [ ] Gate D — mobile touch controls, size crunch, submission

## Controls

| Action | Keys |
|---|---|
| Move | `←` `→` / `A` `D` |
| Jump (hold for height) | `Z` / `W` / `↑` / `Space` |
| Horn strike | `X` / `J` |
| Pogo | `↓` + strike, in the air |
| **Dream Shift** | `S` / `K` |
| Mute | `M` |

Touch controls arrive at Gate D, before the Mobile category is ticked.

## Build

```
npm install
npm run build      # -> dist/index.html + dist/lucid.zip, fails if over budget
npm test           # headless simulation checks
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
| Engine core (loop, input, camera, collision, particles) | 2.0 KB | 5.6 KB | main + state + world |
| Player (movement, combat, abilities) | 1.6 KB | 4.4 KB | abilities pending |
| Shift system + ripple + auto-pulses | 0.7 KB | 0.5 KB | auto-pulses pending |
| Enemies (6 archetypes × 2 forms) | 1.5 KB | 2.7 KB | 1 of 6 archetypes |
| Bosses (3 + mini) | 1.8 KB | — | not started |
| Rendering / art | 1.8 KB | 12.3 KB | |
| Levels + entity placement | 1.2 KB | 1.9 KB | 1 of ~18 rooms |
| Audio | 1.6 KB | 1.4 KB | sfx only, music pending |
| Dialogue + story cards + endings | 0.5 KB | — | not started |
| HTML/CSS/meta | 0.6 KB | 0.2 KB | |

**Zipped: 5,730 / 13,312 bytes (43.0%) — 7,582 remaining.**

Raw bundle bytes are roughly 5× the zipped result, so the raw column is not
comparable to the budget column directly; it is there to show relative growth.
If the total goes over, the cut order is fixed in advance (§11.6): rooms 18→14,
then enemy archetype 6, then boss P2 variety, then swap `fillText` for a bitmap
font. The shift mechanic, the juice, the true ending and the audio are never cut.

## How it is built

Vanilla JS and Canvas 2D. No engine, no images, no fonts, no network.

```
src/state.js      shared game state, seeded RNG, helpers
src/data.js       palettes, room strings, bestiary
src/world.js      tile lookup, world-conditional collision, camera
src/player.js     Prisma: movement, combat, the rainbow gauge
src/entities.js   enemies (data-driven) and particles
src/shift.js      the Dream Shift
src/render.js     every pixel, procedurally
src/audio.js      a ~20 line synth
src/main.js       boot, input, fixed-timestep loop
build.js          esbuild -> terser -> roadroller -> zip -> advzip, with the size gate
test.js           headless simulation checks
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
