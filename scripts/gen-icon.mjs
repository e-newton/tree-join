// Generates images/icon.png — a 128x128 placeholder marketplace icon drawn
// procedurally so it needs no native image tooling (only Node's built-in zlib).
//
// The motif: a teal pair of brackets "[ ]" wrapping three stacked element
// bars — a literal nod to splitting a construct across multiple lines.
//
// This is a PLACEHOLDER. Replace images/icon.png with a real 128x128 design
// before the first Marketplace publish (see RELEASE.md). Re-run with:
//   node scripts/gen-icon.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 128;
const BG = [31, 36, 48, 255]; // #1F2430 slate
const BG2 = [42, 49, 66, 255]; // subtle gradient bottom
const ACCENT = [94, 234, 212, 255]; // #5EEAD4 teal — brackets
const BAR = [148, 163, 184, 255]; // #94A3B8 slate-400 — element bars

const px = new Uint8Array(SIZE * SIZE * 4);

function set(x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = a;
}

function rect(x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, color);
}

// Background vertical gradient.
for (let y = 0; y < SIZE; y++) {
  const t = y / (SIZE - 1);
  const c = [
    Math.round(BG[0] + (BG2[0] - BG[0]) * t),
    Math.round(BG[1] + (BG2[1] - BG[1]) * t),
    Math.round(BG[2] + (BG2[2] - BG[2]) * t),
    255,
  ];
  for (let x = 0; x < SIZE; x++) set(x, y, c);
}

const TH = 9; // bracket stroke thickness
const top = 32;
const bot = 96;
// Left bracket: vertical spine + top/bottom arms.
rect(30, top, TH, bot - top, ACCENT);
rect(30, top, 26, TH, ACCENT);
rect(30, bot - TH, 26, TH, ACCENT);
// Right bracket (mirror).
rect(SIZE - 30 - TH, top, TH, bot - top, ACCENT);
rect(SIZE - 56, top, 26, TH, ACCENT);
rect(SIZE - 56, bot - TH, 26, TH, ACCENT);

// Three stacked element bars between the brackets.
const barX = 50;
const barW = 28;
const barH = 8;
for (const cy of [46, 60, 74]) rect(barX, cy, barW, barH, BAR);

// Encode as PNG (color type 6 = RGBA, 8-bit).
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Raw scanlines, each prefixed with filter byte 0.
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  px.subarray(y * SIZE * 4, (y + 1) * SIZE * 4).forEach((v, i) => {
    raw[y * (SIZE * 4 + 1) + 1 + i] = v;
  });
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'images', 'icon.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes, ${SIZE}x${SIZE})`);
