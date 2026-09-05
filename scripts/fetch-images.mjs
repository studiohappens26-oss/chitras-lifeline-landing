/**
 * Pulls placeholder stock photography from Pexels for every image slot on the
 * landing page. Each slot maps 1:1 to a numbered item in BRIEF.md §4, so when
 * the clinic's real photography arrives you replace the file and nothing else.
 *
 *   node scripts/fetch-images.mjs           # fetch anything missing
 *   node scripts/fetch-images.mjs --force   # re-fetch everything
 *   node scripts/fetch-images.mjs hero-doctor laser-machine   # specific slots
 *
 * Pexels License: free for commercial use, attribution not required. Credits are
 * still written to assets/img/CREDITS.json so we can honour the photographers.
 */
import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets/img');
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

/**
 * `pick` is the index into the search results. Pexels ranks by relevance but the
 * top hit is often the most over-used image on the internet — nudging the index
 * gives a less stocky look. Tuned by eye.
 */
const SLOTS = [
  // — Tier 1 ————————————————————————————————————————————————————
  // Shot on a clean white backdrop so it knocks out cleanly for the hero cutout,
  // which is the treatment brief 1.1 specifies.
  { id: 'hero-doctor',      brief: '1.1',  q: 'confident female doctor white coat standing', o: 'portrait', pick: 4 },
  { id: 'doctor-consult',   brief: '1.2',  q: 'doctor talking with patient office',   o: 'landscape', pick: 1 },
  { id: 'doctor-procedure', brief: '1.3',  q: 'dermatologist skin treatment gloves',  o: 'landscape', pick: 0 },
  { id: 'laser-machine',    brief: '1.4',  q: 'laser treatment machine clinic',       o: 'portrait',  pick: 2 },
  { id: 'laser-handpiece',  brief: '1.5',  q: 'laser hair removal treatment',         o: 'landscape', pick: 0 },
  { id: 'botox-injection',  brief: '1.6',  q: 'botox injection forehead',             o: 'landscape', pick: 0 },
  { id: 'medifacial',       brief: '1.7',  q: 'facial treatment mask spa woman',      o: 'landscape', pick: 1 },
  { id: 'treatment-room',   brief: '1.8',  q: 'modern clinic treatment room interior',o: 'landscape', pick: 0 },
  { id: 'reception',        brief: '1.9',  q: 'clinic reception waiting area modern', o: 'landscape', pick: 1 },
  { id: 'exterior',         brief: '1.10', q: 'medical clinic building entrance',     o: 'landscape', pick: 0 },

  // — Instagram reel posters (9:16) ——————————————————————————————
  { id: 'reel-1',           brief: '4.1',  q: 'woman doctor talking to camera',       o: 'portrait',  pick: 0 },
  { id: 'reel-2',           brief: '4.2',  q: 'dermatologist explaining skincare',    o: 'portrait',  pick: 1 },
  { id: 'reel-3',           brief: '4.3',  q: 'woman skincare routine mirror',        o: 'portrait',  pick: 2 },
  { id: 'reel-4',           brief: '4.4',  q: 'beauty clinic treatment woman',        o: 'portrait',  pick: 1 },

  // — Tier 2 ————————————————————————————————————————————————————
  { id: 'doctor-env',       brief: '2.2',  q: 'female doctor standing clinic arms',   o: 'portrait',  pick: 2 },
  { id: 'detail-gloves',    brief: '2.3a', q: 'medical gloves hands close up',        o: 'landscape', pick: 0 },
  { id: 'detail-serum',     brief: '2.3b', q: 'serum dropper skincare bottle',        o: 'landscape', pick: 1 },
  { id: 'detail-tools',     brief: '2.3c', q: 'medical equipment detail clean',       o: 'landscape', pick: 2 },
  { id: 'skin-macro',       brief: '2.4',  q: 'skin texture macro face beauty',       o: 'landscape', pick: 0 },
  { id: 'model-1',          brief: '2.5a', q: 'indian woman smiling portrait natural',o: 'square',    pick: 0 },
  { id: 'model-2',          brief: '2.5b', q: 'indian woman portrait beauty clean',   o: 'square',    pick: 2 },
  { id: 'model-3',          brief: '2.5c', q: 'young indian woman happy portrait',    o: 'square',    pick: 1 },
  { id: 'team',             brief: '2.7',  q: 'medical team staff clinic uniform',    o: 'landscape', pick: 1 },
  { id: 'consult-room',     brief: '2.8',  q: 'doctor consultation room desk',        o: 'landscape', pick: 2 },

  // — Tier 3 / texture ——————————————————————————————————————————
  { id: 'texture-silk',     brief: '3.4a', q: 'gold silk fabric texture abstract',    o: 'landscape', pick: 0 },
  { id: 'texture-water',    brief: '3.4b', q: 'water droplets macro abstract',        o: 'landscape', pick: 1 },
];

const exists = (p) => access(p).then(() => true, () => false);

async function search(slot) {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', slot.q);
  url.searchParams.set('per_page', '15');
  url.searchParams.set('orientation', slot.o === 'square' ? 'square' : slot.o);

  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText} for "${slot.q}"`);
  const { photos = [] } = await res.json();
  if (!photos.length) throw new Error(`No results for "${slot.q}"`);
  return photos[Math.min(slot.pick, photos.length - 1)];
}

// Pexels honours resize params on the original URL, so we get a properly
// aspect-preserved render instead of one of their pre-cropped sizes.
function sized(photo, orientation) {
  const dim = orientation === 'portrait' ? 'h=1800' : 'w=1800';
  return `${photo.src.original}?auto=compress&cs=tinysrgb&${dim}`;
}

async function fetchSlot(slot, credits) {
  const dest = resolve(OUT, `${slot.id}.jpg`);
  const force = process.argv.includes('--force');
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  if (only.length && !only.includes(slot.id)) return 'skip';
  if (!force && (await exists(dest))) {
    console.log(`  ·  ${slot.id.padEnd(18)} already present`);
    return 'cached';
  }

  const photo = await search(slot);
  const bin = await fetch(sized(photo, slot.o));
  if (!bin.ok) throw new Error(`download ${bin.status}`);
  await writeFile(dest, Buffer.from(await bin.arrayBuffer()));

  credits[slot.id] = {
    brief: slot.brief,
    query: slot.q,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    sourceUrl: photo.url,
    pexelsId: photo.id,
    alt: photo.alt,
  };
  console.log(`  ✓  ${slot.id.padEnd(18)} ${photo.photographer}`);
  return 'fetched';
}

const creditsPath = resolve(OUT, 'CREDITS.json');
await mkdir(OUT, { recursive: true });

let credits = {};
if (await exists(creditsPath)) {
  credits = JSON.parse(await readFile(creditsPath, 'utf8')).images ?? {};
}

console.log(`\nFetching placeholder imagery for ${SLOTS.length} slots\n`);
const failed = [];
for (const slot of SLOTS) {
  try {
    await fetchSlot(slot, credits);
  } catch (err) {
    failed.push(slot.id);
    console.log(`  ✗  ${slot.id.padEnd(18)} ${err.message}`);
  }
}

await writeFile(
  creditsPath,
  JSON.stringify(
    {
      note: 'Placeholder stock only. Replace with the clinic\'s own photography — see BRIEF.md §4.',
      license: 'Pexels License — free for commercial use, attribution not required.',
      images: credits,
    },
    null,
    2,
  ),
);

console.log(`\nDone. ${Object.keys(credits).length} credited.${failed.length ? ` Failed: ${failed.join(', ')}` : ''}\n`);
