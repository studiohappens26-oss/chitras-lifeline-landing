/**
 * Responsive image build. For every JPEG in assets/img it writes WebP copies at
 * a ladder of widths (never upscaling), then rewrites the matching <img> tags
 * in every top-level HTML page so each carries a srcset pointing at them.
 *
 * Why: the source photos are 1200–1800px wide and up to 440 KB. A phone on a
 * paid click needs perhaps a fifth of that. With srcset + sizes the browser
 * picks the smallest file that is sharp at the size it will actually draw.
 *
 *   npm install            # once — sharp is the only (dev) dependency
 *   node scripts/build-images.mjs          # only rebuilds stale variants
 *   node scripts/build-images.mjs --force  # rebuilds everything
 *
 * It also writes the small brand files: the logo mark as WebP at 2x and 3x of
 * the 30px it is drawn at, a 48px favicon, a 180px apple-touch-icon, and a
 * 1200x630 share image (og-NAME.jpg) for every og:image the pages name.
 *
 * Run it after replacing or adding any photo. The generated files are
 * committed, so the Cloudflare build (scripts/dist.mjs) needs no packages.
 */
import sharp from 'sharp';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = resolve(ROOT, 'assets/img');
// Every page at the root (index, botox, privacy, ...), not the scratch pages.
const PAGES = (await readdir(ROOT)).filter((f) => f.endsWith('.html') && !['type.html', 'mochi.html'].includes(f));
const FORCE = process.argv.includes('--force');

// Chosen to land near the common rendered widths at 1x and 2x: floats and
// reel covers (~200–300px), phone full-bleed (~375–430px at 2x → 800), half
// columns on desktop (~640px at 2x → 1200), and full-bleed desktop.
const LADDER = [480, 800, 1200, 1800];
const QUALITY = 70;

const mtime = async (f) => { try { return (await stat(f)).mtimeMs; } catch { return 0; } };

// Share images (og-*.jpg) are outputs of this script, not photos to ladder.
const jpgs = (await readdir(IMG)).filter((f) => /\.jpe?g$/i.test(f) && !f.startsWith('og-'));
const manifest = {};
let built = 0;

for (const file of jpgs) {
  const src = resolve(IMG, file);
  const name = basename(file).replace(/\.jpe?g$/i, '');
  const { width } = await sharp(src).metadata();
  const widths = LADDER.filter((w) => w < width);
  // Always include the source width itself so the largest rendition is never
  // softer than the original.
  if (!widths.includes(width)) widths.push(width);
  manifest[name] = widths;

  const srcTime = await mtime(src);
  for (const w of widths) {
    const out = resolve(IMG, `${name}-${w}.webp`);
    if (!FORCE && (await mtime(out)) > srcTime) continue;
    await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY, effort: 5 }).toFile(out);
    built++;
  }
}

/* Rewrite srcset on every <img> that points at one of these JPEGs. `sizes` is
   left alone where it already exists — it describes the layout, which only a
   person can judge — and defaults to a sensible two-column guess otherwise. */
const DEFAULT_SIZES = '(max-width: 860px) 100vw, 50vw';
let tagged = 0;

for (const page of PAGES) {
  const file = resolve(ROOT, page);
  let html = await readFile(file, 'utf8');
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const m = tag.match(/\ssrc="\/assets\/img\/([^"/]+)\.jpe?g"/);
    if (!m || !manifest[m[1]]) return tag;
    const name = m[1];
    const srcset = manifest[name].map((w) => `/assets/img/${name}-${w}.webp ${w}w`).join(', ');
    let out = tag.replace(/\ssrcset="[^"]*"/, '');
    out = out.replace(/\ssrc="[^"]*"/, (s) => `${s} srcset="${srcset}"`);
    if (!/\ssizes="/.test(out)) out = out.replace(/\ssrcset="[^"]*"/, (s) => `${s} sizes="${DEFAULT_SIZES}"`);
    tagged++;
    return out;
  });

  await writeFile(file, html);
}
await writeFile(resolve(IMG, 'srcset.json'), JSON.stringify(manifest, null, 2) + '\n');

/* ── Brand files ── */
const fresh = async (out, src) => !FORCE && (await mtime(out)) > (await mtime(src));
const MARK = resolve(IMG, 'logo-mark.png');
for (const w of [64, 96]) {
  const out = resolve(IMG, `logo-mark-${w}.webp`);
  if (await fresh(out, MARK)) continue;
  await sharp(MARK).resize({ width: w }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(out);
  built++;
}
// Icons sit on white: a transparent mark vanishes on dark tab strips, and iOS fills alpha with black.
const square = (size, pad) => sharp(MARK)
  .resize({ width: size - pad * 2, height: size - pad * 2, fit: 'contain', background: '#ffffff' })
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' })
  .flatten({ background: '#ffffff' });
for (const [name, size, pad] of [['icon-48.png', 48, 3], ['apple-touch-icon.png', 180, 22]]) {
  const out = resolve(IMG, name);
  if (await fresh(out, MARK)) continue;
  await square(size, pad).png({ compressionLevel: 9 }).toFile(out);
  built++;
}
// One share image per og:image named in the pages, cropped from the photo of the same name.
const ogNames = new Set();
for (const page of PAGES) {
  for (const m of (await readFile(resolve(ROOT, page), 'utf8')).matchAll(/assets\/img\/og-([\w-]+)\.jpg/g)) ogNames.add(m[1]);
}
for (const name of ogNames) {
  const src = resolve(IMG, `${name}.jpg`);
  if (!(await mtime(src))) throw new Error(`og:image og-${name}.jpg has no source photo ${name}.jpg`);
  const out = resolve(IMG, `og-${name}.jpg`);
  if (await fresh(out, src)) continue;
  await sharp(src).resize({ width: 1200, height: 630, fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
  built++;
}
console.log(`${jpgs.length} sources, ${built} variants written, ${tagged} <img> tags across ${PAGES.length} pages given a srcset.`);
