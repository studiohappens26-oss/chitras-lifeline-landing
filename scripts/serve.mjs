/**
 * Minimal static preview server. Cloudflare Pages serves these files directly,
 * so this only needs to mirror its path resolution — no build step exists.
 *
 * For the /api/lead Function you need the real runtime:
 *   npx wrangler pages dev .
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Stub the Pages Function so the form can be exercised locally.
  if (url.pathname === '/api/lead') {
    let body = '';
    for await (const chunk of req) body += chunk;
    console.log('LEAD →', body);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Keep requests inside the project root.
  const file = join(ROOT, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const buf = await readFile(target);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1>');
  }
}).listen(PORT, () => console.log(`Preview running at http://localhost:${PORT}`));
