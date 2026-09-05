/**
 * Downloads the top N results for a query into assets/img/_candidates/ so a
 * slot can be chosen by eye instead of trusting Pexels' relevance ranking.
 *
 *   node scripts/candidates.mjs "female doctor portrait" portrait 6
 *
 * Once you've picked one, set the query + pick index in fetch-images.mjs and
 * re-run it with --force for that slot. The _candidates folder is disposable.
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/* The Pexels key is never committed. It comes from the environment, or from
   the shared ClientWorks .env that lives outside this repo. */
const KEY = process.env.PEXELS_API_KEY || await (async () => {
  try {
    const txt = await readFile(resolve(ROOT, '../reel-factory/.env'), 'utf8');
    return txt.match(/^\s*PEXELS_API_KEY\s*=\s*"?([^"\r\n]+)"?/m)?.[1].trim() || null;
  } catch { return null; }
})();

if (!KEY) {
  console.error('No Pexels API key. Set PEXELS_API_KEY, or add it to ../reel-factory/.env');
  process.exit(1);
}

const [query, orientation = 'landscape', count = '6'] = process.argv.slice(2);
if (!query) {
  console.error('usage: node scripts/candidates.mjs "<query>" [portrait|landscape|square] [count]');
  process.exit(1);
}

const slug = query.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const out = resolve(ROOT, 'assets/img/_candidates');
await mkdir(out, { recursive: true });

const url = new URL('https://api.pexels.com/v1/search');
url.searchParams.set('query', query);
url.searchParams.set('per_page', String(Math.min(Number(count), 15)));
url.searchParams.set('orientation', orientation);

const res = await fetch(url, { headers: { Authorization: KEY } });
if (!res.ok) throw new Error(`Pexels ${res.status}`);
const { photos } = await res.json();

// Small renders — these are only for choosing, not for the page.
for (const [i, p] of photos.entries()) {
  const dim = orientation === 'portrait' ? 'h=900' : 'w=900';
  const bin = await fetch(`${p.src.original}?auto=compress&cs=tinysrgb&${dim}`);
  await writeFile(resolve(out, `${slug}-${i}.jpg`), Buffer.from(await bin.arrayBuffer()));
  console.log(`${String(i).padStart(2)}  ${slug}-${i}.jpg   ${p.photographer}  —  ${p.alt?.slice(0, 70) ?? ''}`);
}
