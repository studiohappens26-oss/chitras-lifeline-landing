/**
 * Responsive image build. For every JPEG in assets/img it writes WebP copies at
 * a ladder of widths (never upscaling), then rewrites the matching <img> tags
 * in index.html so each carries a srcset pointing at them.
 *
 * Why: the source photos are 1200–1800px wide and up to 440 KB. A phone on a
 * paid click needs perhaps a fifth of that. With srcset + sizes the browser
 * picks the smallest file that is sharp at the size it will actually draw.
 *
 *   npm install            # once — sharp is the only (dev) dependency
 *   node scripts/build-images.mjs          # only rebuilds stale variants
 *   node scripts/build-images.mjs --force  # rebuilds everything
 *
 * Run it after replacing or adding any photo. The site itself stays static:
 * the generated files are committed, and Cloudflare Pages needs no build step.
 */
import sharp from 'sharp';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = resolve(ROOT, 'assets/img');
const HTML = resolve(ROOT, 'index.html');
const FORCE = process.argv.includes('--force');

// Chosen to land near the common rendered widths at 1x and 2x: floats and
// reel covers (~200–300px), phone full-bleed (~375–430px at 2x → 800), half
// columns on desktop (~640px at 2x → 1200), and full-bleed desktop.
const LADDER = [480, 800, 1200, 1800];
const QUALITY = 70;

const mtime = async (f) => { try { return (await stat(f)).mtimeMs; } catch { return 0; } };

const jpgs = (await readdir(IMG)).filter((f) => /\.jpe?g$/i.test(f));
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
let html = await readFile(HTML, 'utf8');
let tagged = 0;

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

await writeFile(HTML, html);
await writeFile(resolve(IMG, 'srcset.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${jpgs.length} sources, ${built} variants written, ${tagged} <img> tags given a srcset.`);
