/**
 * Dialogue (§2.5). Every line lives in one indexed array — logic never contains
 * a string. Lines are short by rule: 1-2 lines, <=60 chars each.
 *
 * The interlinked twin narrative (§2.2) is encoded by pairing indices: each
 * dream NPC lies by omission, and its nightmare twin completes the sentence.
 * The player only gets the truth by standing in the same spot in both worlds.
 */
export const DIALOG = [
  /* 0 */ 'The dark gnaws our meadow. Purge it, little light.',
  /* 1 */ '...or is the dark only what they buried?',
  /* 2 */ 'Rest, foal. The lantern remembers you.',
  /* 3 */ 'We kept no vigil. We only looked away.',
  /* 4 */ 'A crack in the air. It is warm, and it is waiting.',
  /* 5 */ 'RED SHARD - the world will turn when you ask it to.',
  /* 6 */ 'ORANGE SHARD - the walls will hold you now.',
  /* 7 */ 'She was carved to smile. No one asked her.',
  /* 8 */ 'Two of seven. The sky is still mostly missing.',
];

/** The dream line and its nightmare twin, per NPC kind. */
export const NPC_LINES = {
  N: [0, 1],   // Nimbus / The Ram
  K: [2, 3],   // The Foalkeeper / The Gravekeeper
};

/** A single active textbox. Only one is ever on screen. */
export const box = { line: -1, t: 0 };

/** Show a line for `frames` frames. Re-showing the same line just refreshes it. */
export function say(index, frames = 150) {
  box.line = index;
  box.t = frames;
}

export function updateDialog() {
  if (box.t > 0 && --box.t === 0) box.line = -1;
}
