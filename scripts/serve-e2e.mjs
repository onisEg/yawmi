// Serve ONLY static app files for throwaway browser QA; never proxy Supabase or use credentials.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
  '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };
createServer(async (req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep) || /(^|[/\\])\./.test(path.slice(1))) {
      res.writeHead(403); return res.end('Forbidden');
    }
    const info = await stat(file);
    if (!info.isFile()) {res.writeHead(404); return res.end('Missing');}
    res.writeHead(200, { 'Content-Type':mime[extname(file)] || 'application/octet-stream',
      'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4177,'127.0.0.1',()=>console.log('Yawmi isolated E2E server http://127.0.0.1:4177'));
