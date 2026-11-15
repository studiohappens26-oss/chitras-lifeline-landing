/**
 * Assemble the deployable site in dist/: only what visitors can request.
 *
 * Cloudflare Pages used to serve the whole repository, which published the
 * brief, the design notes, the build scripts and every unused photo. This
 * copies the pages, the root files Pages reads (_headers, robots.txt, ...),
 * and exactly the assets those files reference, nothing else.
 *
 *   node scripts/dist.mjs      # Cloudflare build command; no packages needed
 *
 * Cloudflare Pages settings: build command `node scripts/dist.mjs`, build
 * output directory `dist`. The functions/ folder stays at the repository root,
 * where Pages looks for it whatever the output directory is.
 *
 * It fails if a page, stylesheet or header file points at an asset that does
 * not exist, so a broken reference stops the deploy instead of shipping.
 */
import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'dist');

// Reference sheets kept in the repo for design work, not part of the site.
const NOT_SITE = new Set(['type.html', 'mochi.html']);
const ROOT_FILES = ['_headers', '_redirects', 'robots.txt', 'sitemap.xml', 'llms.txt'];

const exists = (f) => stat(f).then(() => true, () => false);

const pages = (await readdir(ROOT)).filter((f) => f.endsWith('.html') && !NOT_SITE.has(f));
const rootFiles = [];
for (const f of ROOT_FILES) if (await exists(resolve(ROOT, f))) rootFiles.push(f);
for (const f of ['_headers', 'robots.txt', 'sitemap.xml']) {
  if (!rootFiles.includes(f)) throw new Error(`${f} is missing: run npm run build first`);
}

/* Follow references. Absolute ones (/assets/..., also inside full URLs such as
   og:image) and, in stylesheets, url() relative to the sheet. Query strings
   (?v=hash) and fragments are dropped. Scripts are scanned too, for any asset
   they load by path. */
const wanted = new Set();
const missing = [];
const ABS = /\/assets\/[\w./-]+/g;
const CSS_URL = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/g;

async function scan(rel) {
  const text = await readFile(resolve(ROOT, rel), 'utf8');
  const found = new Set(text.match(ABS) ?? []);
  if (rel.endsWith('.css')) {
    for (const [, u] of text.matchAll(CSS_URL)) {
      if (/^(data:|https?:|#)/.test(u)) continue;
      found.add(u.startsWith('/') ? u : '/' + posix.join(posix.dirname(rel), u));
    }
  }
  for (let p of found) {
    p = p.replace(/[?#].*$/, '').replace(/[.,]+$/, '');
    const key = p.slice(1);
    if (wanted.has(key) || p.endsWith('/')) continue;   // folder patterns in _headers (/assets/css/*)
    if (!(await exists(resolve(ROOT, key)))) { missing.push(`${rel} → ${p}`); continue; }
    if ((await stat(resolve(ROOT, key))).isDirectory()) continue;
    wanted.add(key);
    if (/\.(css|js)$/.test(key)) await scan(key);
  }
}

for (const f of [...pages, ...rootFiles]) await scan(f);
if (missing.length) {
  console.error(`Missing assets:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
let bytes = 0;
for (const rel of [...pages, ...rootFiles, ...wanted]) {
  const to = join(OUT, rel);
  await mkdir(dirname(to), { recursive: true });
  await cp(resolve(ROOT, rel), to);
  bytes += (await stat(to)).size;
}
console.log(`dist/: ${pages.length} pages, ${rootFiles.length} root files, ${wanted.size} assets, ${(bytes / 1048576).toFixed(1)} MB (${relative(ROOT, OUT)})`);
