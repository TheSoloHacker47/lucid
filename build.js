/**
 * LUCID build pipeline  (see design doc §11.4)
 *
 *   src/*.js  --esbuild-->  one bundle
 *             --terser-->   minified
 *             --roadroller--> packed (self-extracting)
 *             --inline-->   index.html
 *             --zip + advzip--> dist/lucid.zip
 *
 * Roadroller only pays for itself once the bundle is big enough that the
 * ~600 byte decoder earns its keep, so we build BOTH variants, zip both, and
 * ship whichever is smaller. Early in development the plain minified build
 * wins; the script will switch over on its own as content grows.
 *
 * The build FAILS (exit 1) if the zip exceeds the js13kGames limit.
 */
import { build } from 'esbuild';
import { minify } from 'terser';
import { Packer } from 'roadroller';
import advzip from 'advzip-bin';
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';

const DEBUG = process.argv.includes('--debug'); // also emit an unminified dist/debug.html
const VERIFY = process.argv.includes('--verify'); // also emit dist/verify.html: the SHIPPED
                                                 // pipeline (terser + roadroller) with the debug
                                                 // hook left in, so compression can be tested
const LIMIT = 13312; // 13 * 1024 — the one sacred rule
const DIST = 'dist';
const TMP = 'dist/.tmp';

/** Minimal HTML shell. Tags are omitted where the HTML5 parser can infer them. */
const html = (js) =>
  '<!DOCTYPE html><meta charset=utf-8><title>LUCID</title>' +
  '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}' +
  'canvas{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);image-rendering:pixelated}</style>' +
  '<canvas id=c></canvas><script>' + js + '</script>';

/** Zip a single index.html and squeeze it with advzip. Returns byte size. */
function pack(name, source) {
  const dir = `${TMP}/${name}`;
  const zip = `${TMP}/${name}.zip`;
  rmSync(dir, { recursive: true, force: true });
  rmSync(zip, { force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, source);
  // -9 max deflate, -X drop extra filesystem attributes we don't need
  execSync(`zip -9 -X -q -j ../${name}.zip index.html`, { cwd: dir });
  execFileSync(advzip, ['-z', '-4', '-q', zip]);
  return statSync(zip).size;
}

const bar = (used) => {
  const filled = Math.min(30, Math.round((used / LIMIT) * 30));
  return '[' + '#'.repeat(filled) + '.'.repeat(30 - filled) + ']';
};

rmSync(DIST, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

// ── 1. bundle ────────────────────────────────────────────────────────────────
const bundled = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  metafile: true,
  define: { DEV: 'false' },   // strips the debug hooks out of the shipped build
});
const raw = bundled.outputFiles[0].text;

// ── 2. minify ────────────────────────────────────────────────────────────────
const { code: min } = await minify(raw, {
  ecma: 2020,
  toplevel: true,
  mangle: { toplevel: true },
  compress: { passes: 3, toplevel: true, booleans_as_integers: true, unsafe: true, unsafe_arrows: true, unsafe_math: true, pure_getters: true },
  format: { comments: false },
});

// ── 3. pack ──────────────────────────────────────────────────────────────────
const packer = new Packer([{ data: min, type: 'js', action: 'eval' }], {});
await packer.optimize(1);
const { firstLine, secondLine } = packer.makeDecoder();
const packed = firstLine + secondLine;

// ── 4. + 5. inline, zip, recompress — keep the smaller variant ───────────────
const plainSize = pack('plain', html(min));
const packedSize = pack('packed', html(packed));
const usePacked = packedSize < plainSize;
const winner = usePacked ? 'packed' : 'plain';
const used = Math.min(plainSize, packedSize);

writeFileSync(`${DIST}/index.html`, html(usePacked ? packed : min));
execSync(`cp ${TMP}/${winner}.zip ${DIST}/lucid.zip`);
rmSync(TMP, { recursive: true, force: true });

// ── 6. report ────────────────────────────────────────────────────────────────
// Per-module numbers are the RAW (pre-minify) bundle contribution — they show
// which system is growing, not its literal share of the zip.
const out = Object.values(bundled.metafile.outputs)[0];
const modules = Object.entries(out.inputs)
  .map(([file, m]) => [file.replace(/^src\//, ''), m.bytesInOutput])
  .sort((a, b) => b[1] - a[1]);
const rawTotal = modules.reduce((n, [, b]) => n + b, 0) || 1;

console.log('\n  LUCID build\n');
console.log('  module            raw bytes    share');
for (const [file, bytes] of modules)
  console.log(`  ${file.padEnd(18)}${String(bytes).padStart(6)}  ${((bytes / rawTotal) * 100).toFixed(1).padStart(7)}%`);

console.log(`\n  bundled ${raw.length}  ->  minified ${min.length}  ->  packed ${packed.length}`);
console.log(`  zip: plain ${plainSize} | roadroller ${packedSize}  ->  shipping ${winner}\n`);
console.log(`  ${bar(used)}  ${used} / ${LIMIT} bytes  (${((used / LIMIT) * 100).toFixed(1)}%)`);
console.log(`  ${LIMIT - used} bytes remaining\n`);

if (used > LIMIT) {
  console.error(`  OVER BUDGET by ${used - LIMIT} bytes. Cut order (§11.6): rooms 18->14, enemy archetype 6, boss P2 variety, bitmap font.\n`);
  process.exit(1);
}

// ── optional unminified debug build ──────────────────────────────────────────
// Exposes window.L so the loop can be stepped by hand (useful when a headless
// browser tab is throttled and requestAnimationFrame never fires).
if (DEBUG) {
  const dbg = await build({
    entryPoints: ['src/main.js'],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    define: { DEV: 'true' },
  });
  writeFileSync(`${DIST}/debug.html`, html(dbg.outputFiles[0].text));
  console.log('  wrote dist/debug.html (unminified, window.L exposed)\n');
}

// ── optional verification build ──────────────────────────────────────────────
// Identical to the shipped artifact except that DEV is true, so the minified +
// packed code can actually be driven and asserted against. This is what proves
// terser's unsafe optimisations and roadroller haven't broken anything.
if (VERIFY) {
  const v = await build({
    entryPoints: ['src/main.js'], bundle: true, format: 'iife', target: 'es2020',
    write: false, define: { DEV: 'true' },
  });
  const vmin = (await minify(v.outputFiles[0].text, {
    ecma: 2020, toplevel: true, mangle: { toplevel: true },
    compress: { passes: 3, toplevel: true, booleans_as_integers: true, unsafe: true, unsafe_arrows: true, unsafe_math: true, pure_getters: true },
    format: { comments: false },
  })).code;
  const vp = new Packer([{ data: vmin, type: 'js', action: 'eval' }], {});
  await vp.optimize(1);
  const vd = vp.makeDecoder();
  writeFileSync(`${DIST}/verify.html`, html(vd.firstLine + vd.secondLine));
  console.log('  wrote dist/verify.html (shipped pipeline + window.L)\n');
}
