/**
 * Minimal static preview server for dist/, the folder Cloudflare Pages deploys
 * (npm run build writes it). It mirrors Pages' path resolution, its 404 page
 * and its Brotli compression, so a local Lighthouse run scores what production
 * will, and an asset missing from dist/ fails here just as it would live.
 *
 * For the /api/lead Function you need the real runtime:
 *   npx wrangler pages dev dist
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as Z } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
try { await stat(join(ROOT, 'index.html')); } catch { console.error('dist/ is empty: run npm run build first.'); process.exit(1); }
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
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
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
    // Pages serves /botox from botox.html; mirror that for extensionless paths.
    const info = await stat(file).catch(() => (extname(file) ? null : stat(`${file}.html`).then(() => 'html')));
    if (!info) throw new Error('not found');
    const target = info === 'html' ? `${file}.html` : info.isDirectory() ? join(file, 'index.html') : file;
    let buf = await readFile(target);
    const type = TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-store' };
    if (/text|javascript|json|svg/.test(type) && /\bbr\b/.test(req.headers['accept-encoding'] || '')) {
      buf = brotliCompressSync(buf, { params: { [Z.BROTLI_PARAM_QUALITY]: 5 } });
      headers['Content-Encoding'] = 'br';
      headers.Vary = 'Accept-Encoding';
    }
    res.writeHead(200, headers);
    res.end(buf);
  } catch {
    // Pages serves 404.html with a real 404 status when it exists.
    const page = await readFile(join(ROOT, '404.html')).catch(() => '<h1>404</h1>');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  }
}).listen(PORT, () => console.log(`Preview running at http://localhost:${PORT}`));
