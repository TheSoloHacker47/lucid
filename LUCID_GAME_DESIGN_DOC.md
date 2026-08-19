# LUCID — Game Design & Development Document
### A js13kGames 2026 Entry · Theme: "Unicorns and Rainbows"

> **Purpose of this document:** This is a complete design + build specification meant to be handed to a coding agent (Claude Code or similar). It contains the story, storyboard, combat design, characters, enemies, bosses, powerups, art/audio direction, technical architecture, byte budget, a day-by-day schedule, submission instructions, and a curated resource list. Follow it top to bottom. Sections marked **[AGENT INSTRUCTION]** are direct instructions to the coding agent.

---

## 0. THE COMPETITION — READ THIS FIRST

**js13kGames 2026 (15th edition)**
- **Dates:** August 13, 2026, 13:00 CEST → **September 13, 2026, 13:00 CEST** (hard deadline).
- **Theme:** **Unicorns and Rainbows** (announced Aug 13). Theme is a *rating criterion* — judges score how well you use it, but interpretation is free.
- **The one sacred rule:** the entire game — code, art, audio, fonts, data — must fit in a **13,312-byte (13 × 1024) ZIP file**. Unzipped, it must contain an `index.html` that runs the game directly in a browser.
- **No external anything:** no CDN libraries, no Google Fonts, no hosted images, no analytics, no API calls. The game must **work fully offline**.
- **Two sources required at submission:**
  1. The minified, zipped ≤13KB package (uploaded via the submit form at js13kgames.com).
  2. A **readable, commented source repo on GitHub** (descriptive variable names, comments — knowledge sharing is a core value of the compo).
- **Categories:** Desktop (primary target) and Mobile (optional but easy to also qualify for if we add touch controls — we will). Special categories (WebXR, Server, Wavedash, Decentralized) are out of scope for this project.
- **Judging criteria (score your design against these):** Theme · Innovation · Gameplay · Graphics · Audio · Controls. Every design decision below maps to at least one of these.
- **Voting:** entrants judge each other's games after the deadline; winners get cash/prizes/swag ($30,000+ prize pool across sponsors in 2026).

**Reality check on scope:** "Hollow Knight" is a 40-hour game made by a studio. In 13KB we are building a **15–25 minute metroidvania-lite** that *feels* like Hollow Knight: tight melee combat, pogo bounces, dash, wall-jump, interconnected map, atmospheric story, memorable bosses. The dream/nightmare switch is our **Innovation** score. Everything in this doc is scoped to be genuinely shippable by Sep 13.

---

## 1. HIGH CONCEPT

**Title:** `LUCID`
**Tagline:** *"Every rainbow casts a shadow."*

You are **Prisma**, the last unicorn foal, asleep and trapped inside her own dying dream. The dream world — a pastel land of rainbows, cloud meadows, and candy forests — is being consumed from the inside by the **Nightmare**: the same world, inverted, ash-dark and thorned. These aren't two places. They are **one world seen through two states of mind**, and Prisma learns to shift between them at will.

**Core loop:** explore ⇄ fight ⇄ shift worlds to solve traversal/combat puzzles ⇄ gain a shard/ability ⇄ open new routes ⇄ boss ⇄ story beat.

**The hook (Innovation):** the **Dream Shift**. One button flips the entire world state instantly:
- Platforms, hazards, doors, and enemies **exist differently in each world**.
- Some enemies are harmless dream-creatures in one world and lethal in the other.
- Mid-combat shifting is a *combat mechanic*, not just a puzzle key (e.g., shift to phase through a projectile, or shift an enemy into its vulnerable form).
- Visually, the entire palette, music, background, and even Prisma's silhouette invert in a single frame with a shockwave ripple. This one moment, done well, wins the Graphics + Innovation votes.

**Theme fit:** Unicorn protagonist. The rainbow is literally the game's central resource — Prisma's health/magic is a **7-color rainbow gauge**, and the plot is about reassembling the **Shattered Rainbow** (7 shards = 7 abilities/story beats). Nightmare world drains color; dream world restores it. The final goal is to repaint the sky.

**Genre:** 2D side-scrolling action-platformer (metroidvania-lite)
**Session length:** 15–25 min full run; a skilled player ~10 min (speedrun-friendly = replay votes)
**Platforms:** Desktop (keyboard) + Mobile (touch) categories

---

## 2. STORY

### 2.1 Backstory (told in the intro — 4 short text cards, ≤12 words each)

Long ago, unicorns painted the sky with the Great Rainbow, a bridge of pure color that kept the world's dreams and nightmares in balance — nightmares were never destroyed, only *held*, because fear that is denied grows teeth. The herd grew afraid of the dark half of their duty. They tried to erase nightmares forever. The Rainbow, forced to be only light, shattered into 7 shards, and the recoil swallowed the herd. Only one foal survived: **Prisma**, who fell into an endless sleep as the two halves of the world tore apart around her.

Intro cards (final text, keep under 13KB spirit — short):
1. `The unicorns painted the sky, holding light and dark in balance.`
2. `Fearing the dark, they tried to erase it.`
3. `The Rainbow shattered. The herd fell silent.`
4. `One foal still dreams. Wake her world — or lose them both.`

### 2.2 The Interlinked Twin Narrative (the heart of the game)

The dream and nightmare are **the same story told from two sides**, and the player only understands the truth by seeing both:

- In the **Dream**, friendly NPC spirits tell Prisma the nightmare is an invader that must be destroyed — "purge the dark, restore the light." They are warm, but their advice is subtly *wrong* (they are echoes of the herd that caused the catastrophe).
- In the **Nightmare**, twisted versions of the *same NPCs* (same location, same silhouette, inverted palette) speak in fragments of regret and reveal the real history: the nightmare is not an invader — it is the world's *grief*, abandoned and festering. Each Dream NPC lies by omission; each Nightmare twin completes the sentence.
- **Mechanically enforced storytelling:** the player MUST visit both versions of key rooms to progress, so the twin narrative is discovered naturally, not optionally.

**The villain twist (mid-game, after Boss 2):** the "Nightmare King" — **Umbra**, a great black unicorn with a broken horn — is revealed to be **Prisma's own reflection**: the half of her that holds every fear the herd tried to erase. Killing Umbra won't end the nightmare; it will end *Prisma*.

**The ultimate goal:** collect all 7 Rainbow Shards, reach the **Sky Loom** at the top of the world, and instead of destroying Umbra, **merge with him** — reweaving a new Rainbow that contains both light and dark. The final "boss fight" has a hidden true resolution (see §7 Bosses).

### 2.3 Act structure

| Act | Zones | Shards | Story beat |
|---|---|---|---|
| **Act 1 — The Sleeping Meadow** | Cloud Meadow, Candy Hollow | Red, Orange | Tutorial; learn Dream Shift; Dream spirits send you to "purge the dark." First cracks in their story. |
| **Act 2 — The Deep Dream** | Prism Caverns, The Mirror Lake | Yellow, Green, Blue | Nightmare twins reveal the herd's crime. Boss 2 ends with Umbra unmasking as Prisma's reflection. |
| **Act 3 — The Unraveling Sky** | Thorn Spire, Sky Loom | Indigo, Violet | World destabilizes — shifting becomes forced/rhythmic in places. Final ascent, final choice. |

### 2.4 Endings
- **False ending (if player just attacks Umbra to 0 HP):** the nightmare dies, the dream turns blinding white and empty; text: `A sky of only light is still a blind sky.` → "…but the dream is not whole. (Try again from the Loom.)" Player is returned to the final room — this is a *soft* fail that teaches the true ending. Costs almost no bytes, doubles narrative impact.
- **True ending (Dream-Shift onto Umbra during his exposed phase — "embrace" instead of strike):** the two unicorns merge into a dual-tone unicorn; the 7 shards orbit and re-fuse; screen floods with the full rainbow gradient over both palettes at once; final card: `The sky remembers every color. Even the dark ones.` + credits + play time + shard count.

### 2.5 Dialogue budget
All dialogue is 1–2 lines, ≤60 chars per line, stored as one compact string array. ~30 lines total (~1.2KB raw, compresses to ~500B). **[AGENT INSTRUCTION]** never hardcode dialogue inline in logic; single `DIALOG` array, indexed.

---

## 3. STORYBOARD — SCENE BY SCENE

Format: `SCENE — location — what the player sees/does — story delivered`

**S01 · Title screen.** Black. A single white unicorn silhouette curled asleep, breathing (2-frame scale pulse). One rainbow band slowly arcs over her. Title `LUCID` in drawn vector letters. `Press any key / Tap`. Music: soft 2-channel lullaby.

**S02 · Intro cards.** The 4 backstory lines fade in/out over a slow pan of a shattered rainbow (7 shard sprites drifting apart). Skippable.

**S03 · Cloud Meadow (Dream).** Wake as Prisma on a pastel cloud plateau. Movement tutorial via 3 floating word-prompts (`←→ run`, `Z jump`, `X horn`). Meet **Nimbus** (dream spirit sheep): "The dark gnaws our meadow. Purge it, little light." First combat vs 2 Gloomlings.

**S04 · The First Rift.** A red shard pulses behind a gap too wide to jump; a rift crack in the air. Touch it → **cutscene-in-gameplay:** the world ripples, colors invert, and Prisma stands in the Nightmare Meadow — the same plateau, ashen, the gap now bridged by a thorn root. Nimbus's nightmare twin (a hollow-eyed ram) says: "…or is the dark only what they buried?" Grab **Red Shard → unlock DREAM SHIFT** (manual shifting from now on).

**S05 · Candy Hollow.** Forest of candy trees (dream) / gnarled licorice bones (nightmare). Shift-platforming: gummy platforms exist only in dream; thorn ledges only in nightmare. Mid-zone: **Boss 1 — SACCHARINE, the Smiling Mare** (see §7). Drop: **Orange Shard → WALL CLING/JUMP**.

**S06 · Prism Caverns.** Crystal caves that refract fake copies of Prisma (visual echo trick — cheap: draw player sprite at offsets with low alpha). Nightmare version: the crystals show the *herd's memories* — 3 one-line lore stones. **Yellow Shard → HORN DASH** behind a shift-puzzle: a crystal door open in dream is a monster's mouth in nightmare.

**S07 · The Mirror Lake.** Setpiece zone. The lake surface mirrors the *other* world in real time (render trick: draw opposite-palette strip flipped below waterline — high graphics-vote value, cheap to code). NPC **Old Cartwright the Snail** speaks in dream; in nightmare his twin finishes every sentence. **Boss 2 — REGRET, the Drowned Stallion** fought half above water (dream rules) and half below (nightmare rules). Post-fight cutscene: your reflection steps OUT of the lake — Umbra reveal. **Green Shard → RAINBOW BURST (heal)** + **Blue Shard → PRISM SHOT** (Umbra leaves it behind, "You will need this to hurt me. If that is still what you want.").

**S08 · Thorn Spire.** Vertical climb. World destabilizes: **auto-shift pulses** every ~4 seconds (telegraphed by a screen-edge ring closing in) force rhythm-platforming — plan your route in both worlds. Gauntlet rooms mix enemies from both worlds. **Indigo Shard → DOUBLE JUMP** guarded by mini-boss **The Shepherd** (corrupted Nimbus — the dream spirits are unraveling too, proving neither side is "safe").

**S09 · Sky Loom.** Short, quiet, no enemies. A broken loom the size of the sky, 6 shards orbiting Prisma. Both worlds visible at once in vertical bands (final art flex). Umbra waits. Dialogue: "Every rainbow casts a shadow. You cast me." **Final Boss — UMBRA** (§7). Violet Shard is *inside him*.

**S10 · Ending(s)** per §2.4, then credits card with byte count joke: `made with ♥ in <13,312 bytes`.

---

## 4. CHARACTERS

### 4.1 Prisma (player)
- Last unicorn foal. Small (~16×12 px logical size), big head, stubby legs, glowing horn — readable at tiny scale.
- **Dream form:** white body, pastel mane rendered as 3 trailing colored ribbons (procedural — see §8), gold horn.
- **Nightmare form (auto when shifted):** ink-black body, single grey ribbon, cracked cyan horn. Same silhouette — the player must always read as "you."
- Personality delivered through animation only: ear flick when idle 3s, skid dust on turn, mane whips on dash.

### 4.2 NPCs (each has a dream + nightmare twin; same position, same silhouette)
| Dream form | Nightmare twin | Role |
|---|---|---|
| **Nimbus**, cloud sheep, warm, urging you to "purge the dark" | **The Ram**, hollow-eyed, speaks the buried truth | Tutorial guide → becomes mini-boss "The Shepherd" in Act 3 |
| **Old Cartwright**, rainbow-shell snail, rambling optimist | **Cartwright's Shadow**, finishes his sentences with the sad half | Lore keeper at Mirror Lake |
| **The Foalkeeper**, floating lantern spirit at save-points | **The Gravekeeper**, same lantern, dim | Save/heal points (campfire equivalent); one line of hint each |

### 4.3 Umbra (the "villain")
Great black unicorn, adult, broken horn, mane of smoke. He is Prisma's exiled half — every fear the herd tried to erase, given shape. Not evil: exhausted and cornered. His three dialogue lines across the game move from menace → grief → invitation:
1. (S07) "You will need this to hurt me. If that is still what you want."
2. (S09) "Every rainbow casts a shadow. You cast me."
3. (final phase, exposed) "End me… or *know* me."

### 4.4 Villains-as-a-force
The true antagonist is **the Blindness** — the herd's refusal to hold darkness. It manifests as the auto-shift instability in Act 3 and the "false ending" whiteout. No sprite needed: it's rules + palette, zero bytes of art.

---

## 5. COMBAT & MOVEMENT DESIGN (the Hollow Knight feel)

### 5.1 Movement (tuned numbers — starting values, tune by feel)
| Property | Value | Notes |
|---|---|---|
| Run speed | 2.2 px/frame @60fps | snappy, near-instant accel (4-frame ramp) |
| Jump | 4.6 px/f initial, gravity 0.24, hold-to-float (gravity 0.12 while held & rising) | variable height = skill ceiling |
| Coyote time | 6 frames | mandatory for feel |
| Jump buffer | 6 frames | mandatory for feel |
| Wall cling | slide at 0.6 px/f; wall-jump 45° kick (after Orange Shard) | |
| Horn Dash | 8 px/f for 9 frames, 45-frame cooldown, i-frames during dash (after Yellow Shard) | dash through thin walls flagged `dashable` |
| Double jump | 0.85× first jump (after Indigo Shard) | |

### 5.2 Attacks
- **Horn Strike (X):** 3-frame lunge slash in facing direction. Range ~14px arc drawn as a rainbow crescent (dream) / dark crescent (nightmare). 4-hit knockback on enemies, slight self-recoil on hit (HK nail feel).
- **Pogo:** down-strike while airborne bounces Prisma up off enemies/hazards (spike balls included) — the single most Hollow-Knight-feeling verb; several platforming challenges require pogo chains.
- **Prism Shot (C, after Blue Shard):** costs 1 color segment; horn fires a beam that is **the current world's opposite color** — it damages enemies *as if they were in the other world* (bypasses dream-form invulnerability). This makes the shift mechanic ranged.
- **Rainbow Burst (hold C, after Green Shard):** channel 1s, consume 2 segments → heal 1 heart + radial knockback. Interruptible when hit (HK focus).

### 5.3 The rainbow gauge (health + magic unified — theme integration)
- One bar of **7 color segments** (ROYGBIV). Taking a hit shatters the leftmost segment with a color-drip particle burst.
- Kills in nightmare world drop **color motes** that refill segments; dream world Foalkeeper lanterns fully restore.
- Prism Shot / Burst *spend* segments → constant risk/reward tension between offense, defense and healing from ONE resource. (Innovation + Theme votes; also cheap: one array.)
- 0 segments → grayscale death dissolve → respawn at last lantern, keep shards (no corpse-run; too expensive in bytes and too punishing for a jam).

### 5.4 Dream Shift as combat verb (S = shift)
- Instant, 0.25s world-ripple animation, 1.5s cooldown shown as a small ring around Prisma.
- **Enemy phase rules (per-enemy, see §6):** some enemies are tanky in one world & fragile in the other; some projectiles exist in only one world (shift = dodge); some enemies *freeze* in the world they don't belong to (shift = crowd control).
- Shifting grants 8 i-frames — a skilled panic-button, balanced by the cooldown.
- **Environmental combat:** thorn walls (nightmare) and gummy bumpers (dream) can be shifted "under" enemies.

### 5.5 Hit feedback (juice checklist — cheap, huge feel payoff)
2-frame hitstop on every landed strike · 3px camera shake on hit taken · white-flash enemy on damage · particle puffs (4–8 squares) · sfx per event (§9). **[AGENT INSTRUCTION]** implement hitstop and screenshake in the core loop FIRST; they cost <200 bytes and define the game feel.

---

## 6. BESTIARY (every enemy has two forms; one spec = two enemies)

| Enemy | Dream form / behavior | Nightmare form / behavior | HP D/N | Found |
|---|---|---|---|---|
| **Gloomling** | Puffball, hops toward you, harmless-ish (contact 1 dmg) | Spikeball, faster hops, lunges | 2 / 3 | Meadow+ |
| **Carousel Pony** | Wooden pony on a pole, patrols, blocks with body (invulnerable head-on in dream) | Skeletal pony, charges when aligned; vulnerable everywhere | 4 / 3 | Candy Hollow+ |
| **Cotton Wisp** | Floats, drifts to you, pops into heal-mote when killed | Wailing wisp, fires 1 tracking spark every 2s | 1 / 2 | Hollow, Caverns |
| **Gumdrop Turret** | Spits arcing gumdrops (pogo-able!) | Dormant stone — safe to pass | 3 / – | Hollow, Spire |
| **Shardback** | Sleeping crystal beetle — invulnerable | Awake, rolls like a wheel along floors/walls | – / 4 | Caverns |
| **Choir of Hooves** (mini) | Three pony spirits circle & sing (slow debuff aura) | Same trio but lunging in sequence | 3×2 | Spire |
| Rule of thumb | dream forms teach the pattern gently | nightmare forms weaponize the same pattern | | |

**Design intent:** the player *learns* an enemy in one world and is *tested* by its twin — the bestiary literally embodies the story's thesis. 6 enemy archetypes ≈ 12 combat encounters of variety at roughly half the code.

---

## 7. BOSSES

### Boss 1 — SACCHARINE, the Smiling Mare (Candy Hollow)
A giant carousel unicorn with a painted-on smile. **Gimmick:** invulnerable in dream (her porcelain armor); shift to nightmare to expose the wooden skeleton — but nightmare adds floor thorns, so you can't camp there.
- P1: gallops wall-to-wall (jump over), stops, stomps (pogo her head).
- P2 (<50%): summons 2 Gloomlings; gallop becomes a bounce-charge.
- Kill line: her smile cracks first. `She was carved to smile. No one asked her.` → **Orange Shard.**

### Boss 2 — REGRET, the Drowned Stallion (Mirror Lake)
Fought on a raft over the mirror lake. Above the waterline = dream rules; his dive attacks drag the fight *into the reflection* = forced nightmare segments (auto-shift on submerge — teaches Act 3's forced shifting early).
- P1: surface lunges + rain of color-drained droplets.
- P2: pulls the raft under; underwater = low-gravity nightmare arena, he becomes a shadow shoal — hit the one with the horn.
- Ends with the Umbra reveal cutscene. → **Green + Blue Shards.**

### Mini-boss — THE SHEPHERD (Thorn Spire)
Corrupted Nimbus: the sweet tutorial sheep, huge, wool full of thorns. Auto-shift pulses continue DURING the fight (arena hazard layout differs per world). Short, brutal, sad. One line: `He only ever wanted the flock safe.` → **Indigo Shard.**

### Final Boss — UMBRA (Sky Loom) — 3 phases + hidden resolution
- **P1 (nightmare-locked):** Umbra duels with horn slashes and smoke-dash mirrors of YOUR moveset (he has your dash and pogo — cheap: reuse player code).
- **P2 (shift-duel):** he begins shifting too — he is only vulnerable when you are in the SAME world as him (his coat glows the world's color). Prism Shot bypasses this (reward for kit mastery).
- **P3 (<25% HP):** he kneels, exposed, horn dimming. A prompt appears only if the player has all 6 shards: `S — reach out`. 
  - Attack → false ending (§2.4), retry from start of P3.
  - **Shift INTO him (press S while touching him)** → true ending: merge cutscene, **Violet Shard** completes the rainbow.
- HP: P1 12 hits, P2 16, P3 scripted.

---

## 8. ART DIRECTION & ANIMATION (all procedural — zero image files)

### 8.1 Rendering strategy
**No PNG/sprite sheets.** Everything is drawn with Canvas 2D paths, rects, arcs and gradients at runtime, composed of few primitives so it compresses brilliantly (repeated drawing code ≈ free after zip). Render at a low internal resolution (e.g. **320×180**) onto an offscreen canvas, scale up with `image-rendering: pixelated` → instant cohesive chunky-crisp look, tiny draw cost, and mobile-friendly.

### 8.2 The two palettes (this IS the game's identity)
```
DREAM  bg: #ffeef8 → #cde7ff vertical gradient; ground #f9c8e0
       accents: #ff9ecb #ffd36e #9be8a8 #7fd4ff #c49bff ; ink #6a5a7a
NIGHT  bg: #14101f → #241a33; ground #2c2140
       accents: #7a4fd0 #d04f7a #4fd0c8 (sparse) ; ink #e8e4f0 ; fog overlay rgba(20,10,35,.35)
```
Implementation: one `PAL` object with two entries; every draw call reads `PAL[world]`. The **shift** is: swap index + run the ripple shader-fake (expanding circle that draws the *other* world inside it for 15 frames — draw world A, clip circle, draw world B inside clip). This single effect is the game's screenshot.

### 8.3 Drawing Prisma (the unicorn) — ~40 lines of canvas
Body = rounded rect; head = circle + snout rect; legs = 4 short rects with 2-frame alternating offsets for run; horn = small triangle with glow (`shadowBlur` in dream only — it's expensive, use sparingly); **mane & tail = 3 polylines whose points trail the head position history** (store last 10 positions, draw colored ribbons through them). The trailing-ribbon mane does 80% of the character's charm and is ~15 lines of code. Eye = 1px, blinks every ~180 frames.

### 8.4 Animation system
No frame sheets — **procedural keyframing**:
- Run: leg phase offsets via `sin(t)`, body bob 1px.
- Jump/fall: stretch 1.1×/squash 0.9× (squash & stretch sells everything).
- Horn strike: body lunges 3px, crescent arc drawn for 3 frames.
- Dash: body stretches 1.4×, ribbons snap straight, 3 afterimages (redraw at old positions, alpha .3/.2/.1).
- Hit: white-fill flash 2 frames + knockback.
Enemies follow the same recipe: primitives + sin-wobble + squash on state change. Bosses = bigger primitives + 2–3 scripted limbs.

### 8.5 Environments
- Tile-based collision (16px tiles), but *rendered* organically: ground drawn as one filled path with sin-noise top edge, so it never looks like a tile grid.
- Parallax: 2 background layers (far hills/spires as filled sine silhouettes, near clouds/thorns), 0.3× and 0.6× scroll. Dream clouds = white arcs; nightmare = inverted drips (same code, flipped Y!).
- Rainbows: `for(i<7) arc(...)` with palette colors — used as bridges (dream) that become chain-link bones (nightmare).
- Level data: each zone is a string map (`'#'` solid, `'^'` spikes-N, `'~'` gummy-D, letters for entities), rooms ~40×12 tiles, ~18 rooms total. Strings compress extremely well. Suffix `-D`/`-N` marks world-conditional tiles: **one map string per room encodes BOTH worlds** (e.g. `g` = platform only in dream, `t` = only in nightmare).

### 8.6 Typography & UI
Tiny 3×5 px bitmap font encoded as a binary string (~300B) OR just use `ctx.fillText` with a generic monospace at low-res (0 bytes — acceptable, looks fine pixelated; DECIDE by budget). UI: 7 color segment diamonds top-left, shard icons bottom-right, shift-cooldown ring around Prisma only when on cooldown.

---

## 9. AUDIO (WebAudio, generated at runtime)

### 9.1 SFX — ZzFX (~1KB library, each sound = one ~20-number array)
Required set (13 sounds, fitting): jump, land, horn hit, horn whiff, pogo, dash, shift-ripple (the signature sound — make it a reversed sweep), hurt, segment-shatter, mote pickup, shard fanfare, boss roar, heal chime. Author them at zzfx.3d2k.com and paste arrays.

### 9.2 Music — ZzFXM (~2KB player incl. ZzFX) or SoundBox export
Three short loops, all variations of ONE melody (theme = story: same tune, two worlds):
1. **Dream loop:** the lullaby, major key, 2 channels, slow.
2. **Nightmare loop:** same notes, minor key, pitched down, added noise channel. (Reuse the same pattern data with a key/tempo transform = huge byte savings + brilliant narrative device — reviewers notice this.)
3. **Boss loop:** faster variation.
On shift, crossfade dream↔nightmare loops over 0.4s (keep both playing, swap gains — they share tempo/beat position so it's seamless and feels incredible).
Audio must start after first user input (browser autoplay policy). Mute button (`M`).

---

## 10. CONTROLS

| Action | Desktop | Mobile (Mobile category requirement) |
|---|---|---|
| Move | ←→ / AD | left half: virtual joystick strip (drag) |
| Jump | Z / W / ↑ / Space | right side: bottom-right button |
| Horn strike | X / J | right side: bottom-mid button |
| Dream Shift | S / K | right side: top button (biggest, glowing) |
| Prism Shot / Burst | C / L (tap / hold) | hold Attack |
| Pause / Map | P / Enter | top-right icon |
| Mute | M | in pause |

Touch buttons: large (48px+ at display scale), semi-transparent, only rendered on touch devices (`ontouchstart` detection). Test on a real phone — Controls is a judged criterion.

---

## 11. TECHNICAL ARCHITECTURE — [AGENT INSTRUCTIONS]

### 11.1 Stack decision
**Vanilla JS + Canvas 2D. No engine.** Rationale: LittleJS (~4KB min) and Kontra (~2–5KB tree-shaken) are excellent, but our needs (custom shift-rendering, dual-world tilemap, procedural art) mean an engine mostly costs bytes without saving work. If the agent strongly prefers a helper, **Kontra.js (tree-shaken imports only)** is the approved fallback. Study `js13kBreakouts` repo for how each option is wired.

### 11.2 Project layout (readable repo — required by rules)
```
/src
  main.js        // boot, loop (fixed 60fps step + render), state machine: TITLE/INTRO/PLAY/PAUSE/END
  world.js       // room strings, tile collision, world-flag logic, camera
  player.js      // Prisma: movement, combat, abilities, gauge
  entities.js    // enemy archetypes (data-driven table), projectiles, particles, NPCs
  bosses.js      // 3 bosses + mini-boss (scripted state machines)
  shift.js       // world state, ripple transition, auto-shift pulses
  render.js      // palettes, draw helpers, parallax, unicorn/enemy painters, UI
  audio.js       // zzfx + zzfxm data, music crossfade
  dialog.js      // DIALOG array + textbox
  data.js        // level strings, enemy stat table, shard/ability flags
index.html       // canvas + inlined built bundle (build output)
build.js / package.json  // build pipeline (see 11.4)
README.md        // controls, description, screenshot, build instructions
```

### 11.3 Core patterns
- Single `G` game-state object; entities in one array with `type` tags (lightweight, no ECS lib needed at this scale; js13k-ecs is approved if wanted).
- Fixed timestep update (accumulator), render interpolation optional.
- Collision: AABB vs tile grid; entity-vs-entity AABB. Tiles queried through `solidAt(x, y, world)` so ALL world-conditional logic lives in one function.
- Deterministic seeded RNG (mulberry32) for particles/wobbles → consistent replays and smaller code.
- `localStorage` for: mute, best time, lantern checkpoint (allowed — it's client-side).
- **Size guardrails:** no classes where object literals do, no template literals in hot paths for the packer, reuse draw functions with palette params, every enemy/boss = data + shared behaviors.

### 11.4 Build & compression pipeline (this is how you actually hit 13KB)
1. Bundle: `rollup` (or esbuild) → single JS file.
2. Minify: `terser` with aggressive options (`--mangle --compress passes=3, toplevel, booleans_as_integers`).
3. **Roadroller** (js packer; typically −15–30% on top of zip — the community's standard weapon).
4. Inline JS into `index.html` (one file total unless a second is needed).
5. Zip, then **recompress with ECT (`ect -9 -zip`) or `advzip -z -4`** — saves ~0.5–1KB over normal zip. 
6. CI-style check: build script prints `bytes used / 13312` and **fails the build if over**. Run it EVERY commit.

### 11.5 Byte budget (zipped, after roadroller+ect) — total 13,312
| System | Budget |
|---|---|
| Engine core (loop, input, camera, collision, particles) | 2.0 KB |
| Player (movement, combat, abilities) | 1.6 KB |
| Shift system + ripple + auto-pulses | 0.7 KB |
| Enemies (6 archetypes ×2 forms, data-driven) | 1.5 KB |
| Bosses (3 + mini) | 1.8 KB |
| Rendering/art (painters, palettes, parallax, UI) | 1.8 KB |
| Levels (18 rooms as strings) + entity placement | 1.2 KB |
| Audio (zzfx+zzfxm player + 13 sfx + 3 songs) | 1.6 KB |
| Dialogue + story cards + endings | 0.5 KB |
| HTML/CSS/meta + slack | 0.6 KB |
| **Reserve (you WILL need it)** | **≈1.0 KB** |

**[AGENT INSTRUCTION]** Track actual vs budget in README table each build. If over: cut in this order — room count (18→14), enemy archetype 6, boss P2 variety, font (switch to fillText), NEVER cut: shift mechanic, hitstop/juice, true ending, audio.

### 11.6 MVP gates (build in this order; game must be shippable at every gate)
1. **Gate A (playable toy):** run/jump/strike + one room + hitstop + 1 enemy + shift swapping palettes & one conditional platform. ← the whole game's fun lives here; iterate until it FEELS right.
2. **Gate B (vertical slice):** Cloud Meadow + Candy Hollow, Boss 1, shards 1–2, save lantern, dream/night music crossfade.
3. **Gate C (content complete):** all zones/bosses/abilities/dialogue, both endings.
4. **Gate D (ship):** mobile controls, size pass, polish pass, playtesting, submission.

---

## 12. SCHEDULE (today Aug 19 → deadline Sep 13, 13:00 CEST = 16:30 IST)

| Dates | Goal |
|---|---|
| Aug 19–21 | Repo + build pipeline + Gate A. Tune movement until it feels like HK. |
| Aug 22–25 | Shift system complete (ripple, conditional tiles, enemy forms). Gate B start. |
| Aug 26–29 | Boss 1, Act 1 rooms, audio in (sfx + dream/night loops). **Gate B done.** |
| Aug 30–Sep 3 | Acts 2 zones, Boss 2 + Umbra reveal, abilities 3–5. |
| Sep 4–7 | Act 3, Shepherd, Umbra final boss, both endings. **Gate C.** |
| Sep 8–10 | Mobile controls, size crunch, difficulty tuning, external playtests (share in js13k Discord/Slack). |
| Sep 11–12 | Freeze features. Bug fixes, README, screenshots, description text. |
| Sep 13 morning IST | **Submit before 16:30 IST.** Never submit in the final hour — the form gets hammered. |

---

## 13. SUBMISSION CHECKLIST (do not skip any line)

1. Final zip ≤ **13,312 bytes**; unzips to a working `index.html`; test by unzipping into a clean folder and opening with a local static server AND via `file://`, offline, in Chrome + Firefox (+ one mobile browser).
2. GitHub repo public with **readable source** (comments, real variable names), README with: game title, description, controls, screenshot, build instructions, and tools/credits.
3. Screenshot(s) prepared: 400×250 min; capture the shift-ripple moment — it's the money shot.
4. Write the entry description (2–4 sentences; mention the dream/nightmare shift and theme).
5. Go to **js13kgames.com/2026** → Submit form (opens a few days after start, i.e., already open): provide the zip, GitHub URL, categories (**Desktop + Mobile**), description, screenshot.
6. Categories sanity check: Mobile requires genuinely playable touch controls — verify on a real device or don't tick Mobile.
7. After submitting: join voting (Sep 14 – Oct 4) — as an entrant you're expected to play & rate others (criteria: Theme, Innovation, Gameplay, Graphics, Audio, Controls) and leave written feedback. This also gets your game seen.
8. Post progress + final game with **#js13k** on X/Mastodon/Bluesky; join the js13kGames **Slack/Discord** (links on site) for playtesting help.
9. Write a short post-mortem afterwards — traditional in this community and great for your audience-building.

---

## 14. RESOURCES (curated from js13kgames.com/resources + community)

**Study first**
- js13kBreakouts — github.com/js13kGames/js13kBreakouts — same game built with each micro-engine; the best "how do I wire this" reference.
- Past winners: js13kgames.com (2025 winners incl. CLAWSTRIKE), Q1K3 by phoboslab (2021) — masterclass in 13KB scope.
- "Create a 13 kB game in 30 days" — github.blog article by Lee Reilly (tips/minification).
- Tiny platformer tutorial — codeincomplete.com/posts/tiny_platformer.

**Engines/libraries (only if chosen; vanilla is the plan)**
- Kontra.js — straadi.github.io/kontra — micro-library built FOR js13k, tree-shakeable.
- LittleJS — github.com/KilledByAPixel/LittleJS — fast, batteries included (~4KB+).
- js13k-ecs (1KB ECS), js13k-2d (2KB WebGL renderer) — github.com/kutuluk.

**Audio**
- ZzFX — github.com/KilledByAPixel/ZzFX (sound designer: killedbyapixel.github.io/ZzFX).
- ZzFXM — github.com/keithclark/ZzFXM (tracker: keithclark.github.io/ZzFXM).
- SoundBox — sb.bitsnbites.eu (alt tracker with tiny player).

**Size tooling**
- Roadroller — lifthrasiir.github.io/roadroller — JS packer, the standard.
- Terser — terser.org (try it live: try.terser.org).
- ECT — github.com/fhanau/Efficient-Compression-Tool; AdvanceCOMP `advzip` — github.com/amadvance/advancecomp.
- Mini URI (base64 asset embedding, if ever needed) — xem.github.io/miniURI.

**Templates/boilerplates**
- js13k-rollup (ES modules + gulp/rollup build), foumart/JS.13kGames (PWA/mobile-oriented starter with Closure + Roadroller pipeline).

**Community**
- js13kGames Slack & Discord (invite links on js13kgames.com) — playtesting, size-golf help, moral support.
- #js13k hashtag for progress posts.

---

## 15. ONE-PARAGRAPH BRIEF FOR THE CODING AGENT

Build **LUCID**, a 13KB (zipped, hard limit 13,312 bytes) vanilla-JS Canvas 2D side-scrolling action platformer for js13kGames 2026 (theme: Unicorns and Rainbows), per this document: Hollow-Knight-feel movement/combat (coyote time, jump buffer, pogo, hitstop), a one-button **Dream Shift** that flips the entire world between pastel Dream and dark Nightmare states (palettes, tiles, enemies, music all world-conditional), a 7-segment rainbow gauge unifying HP and magic, 7 collectible shards granting abilities, 6 dual-form enemy archetypes, 3 bosses + 1 mini-boss, an interlinked twin narrative delivered by paired NPCs, and a final encounter with a hidden true ending (merge, don't kill). Work through the MVP gates in §11.6 in order, keep the byte-budget table in §11.5 updated every build, enforce the size limit in the build script, and prepare the submission per §13 before September 13, 2026, 13:00 CEST.
