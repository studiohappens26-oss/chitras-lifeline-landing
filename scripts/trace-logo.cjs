/**
 * Traces the clinic's logo PNG into the preloader's inline SVG.
 *
 * The preloader builds the logo piece by piece, so it needs the mark as
 * separate vector parts — the two hair strokes, the lashes and brow, the lips,
 * the chin-and-leaf line, and every letter of both wordmark lines on its own.
 * No vector master exists, so this recovers one from the PNG: it separates the
 * logo's three inks by colour, splits the mark into its connected shapes and
 * each text line into letters (by the column gaps between them), and traces
 * every part with potrace.
 *
 *   npm install
 *   node scripts/trace-logo.cjs "path/to/logo.png" > pl-logo.svg
 *   node scripts/trace-logo.cjs "path/to/logo.png" --preview check.png > pl-logo.svg
 *
 * Paste the output over the <svg class="pl__logo"> in index.html. The source
 * must be the full lockup — the mark above "Chitra's" above "Lifeline Clinic" —
 * on a transparent background.
 */
const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs');

const args = process.argv.slice(2);
const SRC = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--preview');
const PREVIEW = args.includes('--preview') ? args[args.indexOf('--preview') + 1] : null;
if (!SRC) { console.error('usage: node scripts/trace-logo.cjs <logo.png> [--preview out.png]'); process.exit(1); }

const W = 1000;       // working width; the viewBox is in these units
const DISPLAY = 272;  // the width attribute on the emitted <svg>

const trace = (png) => new Promise((res, rej) =>
  potrace.trace(png, { threshold: 128, blackOnWhite: true, turdSize: 6, optTolerance: 0.35, alphaMax: 1 },
    (err, svg) => (err ? rej(err) : res((svg.match(/ d="([^"]+)"/) || [])[1] || ''))));

(async () => {
  const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer();
  const { data, info } = await sharp(trimmed)
    .resize({ width: W - 40 })
    .extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const H = info.height;
  const N = W * H;

  // 0 background, 1 magenta, 2 cyan, 3 near-black. Anti-aliased edge pixels
  // below the alpha threshold are dropped; potrace smooths the edge back.
  const cls = new Uint8Array(N);
  const sums = { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0], 3: [0, 0, 0, 0] };
  for (let i = 0; i < N; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    if (a < 110) continue;
    let c = 0;
    if (Math.max(r, g, b) < 95) c = 3;
    else if (r > g + 50 && b > g + 10) c = 1;
    else if (b > r + 40 && g > r + 20) c = 2;
    if (!c) continue;
    cls[i] = c;
    if (a > 240) { const s = sums[c]; s[0] += r; s[1] += g; s[2] += b; s[3]++; }
  }
  const hex = (c) => { const s = sums[c]; return '#' + [0, 1, 2].map((k) => Math.round(s[k] / s[3]).toString(16).padStart(2, '0')).join(''); };
  const ink = { magenta: hex(1), cyan: hex(2), dark: hex(3) };

  // Bands of non-empty rows: the last two are the text lines, the rest the mark.
  const rowHas = (y) => { for (let x = 0; x < W; x++) if (cls[y * W + x]) return true; return false; };
  const runs = []; let start = -1;
  for (let y = 0; y < H; y++) {
    const h = rowHas(y);
    if (h && start < 0) start = y;
    if (!h && start >= 0) { runs.push([start, y - 1]); start = -1; }
  }
  if (start >= 0) runs.push([start, H - 1]);
  if (runs.length < 3) throw new Error(`expected the mark and two text lines, found ${runs.length} row band(s)`);
  const line2 = runs[runs.length - 1], line1 = runs[runs.length - 2];
  const markEnd = runs[runs.length - 3][1];

  // Connected components of one ink inside a row band (4-connectivity).
  const components = (c, y0, y1) => {
    const seen = new Uint8Array(N), out = [];
    for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (cls[i] !== c || seen[i]) continue;
      const px = [], q = [i]; seen[i] = 1;
      while (q.length) {
        const j = q.pop(); px.push(j); const jx = j % W;
        for (const k of [j - 1, j + 1, j - W, j + W]) {
          if (k < 0 || k >= N || seen[k] || cls[k] !== c) continue;
          const ky = (k / W) | 0;
          if (ky < y0 || ky > y1 || Math.abs((k % W) - jx) > 1) continue;
          seen[k] = 1; q.push(k);
        }
      }
      if (px.length > 20) out.push({ px, area: px.length });
    }
    return out.sort((a, b) => b.area - a.area);
  };

  // Magenta in the mark is hair (large strokes) or lips (small).
  const mag = components(1, 0, markEnd);
  const hair = mag.filter((m) => m.area > mag[0].area * 0.08);
  const lips = mag.filter((m) => m.area <= mag[0].area * 0.08);

  // Letters: runs of non-empty columns within a text line.
  const letters = ([y0, y1]) => {
    const colHas = (x) => { for (let y = y0; y <= y1; y++) if (cls[y * W + x]) return true; return false; };
    const spans = []; let s = -1;
    for (let x = 0; x < W; x++) {
      const h = colHas(x);
      if (h && s < 0) s = x;
      if (!h && s >= 0) { spans.push([s, x - 1]); s = -1; }
    }
    if (s >= 0) spans.push([s, W - 1]);
    return spans.map(([x0, x1]) => {
      const px = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (cls[y * W + x]) px.push(y * W + x);
      return { px };
    });
  };

  const mask = (groups) => {
    const m = Buffer.alloc(N, 255);
    for (const g of groups) for (const i of g.px) m[i] = 0;
    return sharp(m, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  };
  const traceOne = async (groups) => trace(await mask(groups));

  const parts = {
    hair: await Promise.all(hair.map((h) => traceOne([h]))),
    face: [await traceOne(components(3, 0, markEnd))],
    lips: [await traceOne(lips)],
    leaf: [await traceOne(components(2, 0, markEnd))],
    w1: await Promise.all(letters(line1).map((g) => traceOne([g]))),
    w2: await Promise.all(letters(line2).map((g) => traceOne([g]))),
  };

  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < N; i++) if (cls[i]) {
    const x = i % W, y = (i / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const pad = 6;
  const vb = [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];

  // Integer coordinates: ~1000 units drawn at ~270px, so finer is invisible.
  const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(+n)));
  const path = (cls, d) => `<path class="pl-part ${cls}" d="${round(d)}"/>`;
  const svg = [
    `<svg class="pl__logo" viewBox="${vb.join(' ')}" width="${DISPLAY}" height="${Math.round(DISPLAY * vb[3] / vb[2])}" aria-hidden="true" focusable="false">`,
    `  <g fill="${ink.magenta}">${parts.hair.map((d, i) => path(`pl-hair pl-hair--${i + 1}`, d)).join('')}</g>`,
    `  <g fill="${ink.dark}">${path('pl-face', parts.face[0])}</g>`,
    `  <g fill="${ink.magenta}">${path('pl-lips', parts.lips[0])}</g>`,
    `  <g fill="${ink.cyan}">${path('pl-leaf', parts.leaf[0])}</g>`,
    `  <g fill="${ink.cyan}">${parts.w1.map((d) => path('pl-w1', d)).join('')}</g>`,
    `  <g fill="${ink.magenta}">${parts.w2.map((d) => path('pl-w2', d)).join('')}</g>`,
    '</svg>',
  ].join('\n');

  process.stdout.write(svg + '\n');
  console.error(`hair ${parts.hair.length} · lips ${lips.length} · letters ${parts.w1.length} + ${parts.w2.length} · ${svg.length} bytes`);

  if (PREVIEW) {
    const standalone = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    await sharp(Buffer.from(standalone)).resize(480).flatten({ background: '#F5EBF0' }).png().toFile(PREVIEW);
    console.error(`preview → ${PREVIEW}`);
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
