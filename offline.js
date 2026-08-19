/**
 * The §13.1 offline check, run against the SHIPPED artifact.
 *
 * Reads the built index.html exactly as a browser opening it from file:// would
 * — raw bytes, strict UTF-8 decode — then executes the inline script against a
 * stub DOM and drives it for a few hundred frames with no network of any kind.
 *
 * This is what proves three separate things at once: that roadroller's packed
 * payload survives being written to disk and read back, that terser's unsafe
 * optimisations did not break the game, and that nothing reaches for the
 * network. Run it on dist/index.html or on a fresh extraction of the zip.
 *
 *   node offline.js dist/index.html
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const path = process.argv[2] || 'dist/index.html';
const bytes = readFileSync(path);
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
};

console.log(`\n  LUCID — offline check of ${path}\n`);

// 1. strict UTF-8 validity: a mangled high codepoint would break the unpacker
let text = '';
try {
  text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  ok('valid UTF-8', 1, `${bytes.length} bytes on disk, ${text.length} chars`);
} catch (e) {
  ok('valid UTF-8', 0, e.message);
  process.exit(1);
}

// 2. browsers only pre-scan the first 1024 bytes for <meta charset>
ok('<meta charset=utf-8> within the first 1024 bytes',
   bytes.subarray(0, 1024).toString('latin1').includes('charset=utf-8'));

// 3. nothing may reach outside the file
const urls = [...text.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0]);
ok('no external references', urls.length === 0, urls.join(' '));

// 4. execute it against a stub DOM
const canvasOps = [];
const ctx2d = new Proxy({}, {
  get: (t, k) => {
    if (k === 'canvas') return { width: 320, height: 180 };
    if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (k === 'measureText') return () => ({ width: 10 });
    return (...a) => { canvasOps.push(k); };
  },
  set: () => true,
});
const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx2d };

/** Enough of Web Audio for the synth and the two music loops (§9). */
const audioParam = () => ({
  value: 0,
  cancelScheduledValues() {}, setValueAtTime() {},
  linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
});
function StubAudioContext() {
  this.sampleRate = 44100;
  this.state = 'running';
  this.currentTime = 0;
  this.destination = { connect() {} };
  this.resume = () => {};
  this.close = () => {};
  this.createBuffer = (chans, len) => {
    const data = new Float32Array(len);
    return { length: len, numberOfChannels: chans, getChannelData: () => data };
  };
  this.createGain = () => ({ gain: audioParam(), connect() {}, disconnect() {} });
  this.createBufferSource = () => ({
    buffer: null, loop: false, playbackRate: audioParam(),
    connect() {}, start() {}, stop() {},
  });
  this.createOscillator = () => ({ frequency: audioParam(), type: 'sine', connect() {}, start() {}, stop() {} });
}

let rafCb = null;
const win = {
  document: { getElementById: () => canvas },
  requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
  performance: { now: () => 0 },
  innerWidth: 1280, innerHeight: 800,
  AudioContext: StubAudioContext,
  localStorage: { getItem: () => null, setItem() {} },
  addEventListener() {},
  // any attempt to reach the network is a hard failure, not a silent no-op
  fetch: () => { throw new Error('the game tried to fetch()'); },
  XMLHttpRequest: function () { throw new Error('the game tried to use XMLHttpRequest'); },
  Math, Object, Array, String, Number, Boolean, JSON, Date, Error, TypeError, RangeError,
  isNaN, parseInt, parseFloat, Symbol, Function, RegExp, Map, Set, Promise, console,
  Uint8Array, Uint8ClampedArray, Float32Array, Int32Array, Uint32Array,
};
win.window = win; win.self = win; win.globalThis = win;

const script = text.slice(text.indexOf('<script>') + 8, text.lastIndexOf('</' + 'script>'));
try {
  vm.createContext(win);
  vm.runInContext(script, win, { timeout: 20000 });
  ok('packed script decoded and executed', 1);
} catch (e) {
  ok('packed script decoded and executed', 0, e.message);
  process.exit(1);
}

ok('input handlers installed', !!win.onkeydown);
ok('game loop scheduled', !!rafCb);

// 5. drive it: title, start, play, shift worlds, walk to the next room
try {
  for (let i = 0; i < 3; i++) rafCb(i * 16.7);
  win.onkeydown({ code: 'KeyZ', preventDefault() {} });
  for (let i = 3; i < 90; i++) rafCb(i * 16.7);
  win.onkeydown({ code: 'KeyS', preventDefault() {} });
  win.onkeydown({ code: 'ArrowRight', preventDefault() {} });
  for (let i = 90; i < 400; i++) rafCb(i * 16.7);
  win.onkeydown({ code: 'KeyX', preventDefault() {} });
  for (let i = 400; i < 500; i++) rafCb(i * 16.7);
  ok('ran 500 frames offline', 1, `${canvasOps.length} canvas ops`);
} catch (e) {
  ok('ran 500 frames offline', 0, e.message);
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
