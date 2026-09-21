import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "./build.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const port = Number.parseInt(process.env.PORT || "4321", 10);
const host = process.env.HOST || "127.0.0.1";
if (process.env.BASE_PATH && process.env.BASE_PATH !== '/') {
  throw new Error('This organization Pages site must be served from /; unset BASE_PATH.');
}
const contentTypes = { '.css':'text/css; charset=utf-8', '.html':'text/html; charset=utf-8', '.jpg':'image/jpeg', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.pdf':'application/pdf', '.vtt':'text/vtt; charset=utf-8' };
await buildSite();
const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    let filePath = path.resolve(output, pathname.slice(1) || 'index.html');
    if (!filePath.startsWith(output + path.sep)) { response.writeHead(403).end('Forbidden'); return; }
    let info = await stat(filePath);
    if (info.isDirectory()) { filePath = path.join(filePath, 'index.html'); info = await stat(filePath); }
    const headers = { 'Cache-Control':'no-cache', 'Content-Type':contentTypes[path.extname(filePath)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'X-Content-Type-Options':'nosniff' };
    let start = 0; let end = info.size - 1; let status = 200;
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range':`bytes */${info.size}` }).end(); return; }
      start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      if (start > end || start >= info.size) { response.writeHead(416, { 'Content-Range':`bytes */${info.size}` }).end(); return; }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = end - start + 1;
    response.writeHead(status, headers);
    if (request.method === 'HEAD' || info.size === 0) { response.end(); return; }
    const stream = createReadStream(filePath, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch { response.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }).end('Not found'); }
});
server.listen(port, host, () => console.log(`Local preview: http://${host}:${port}/`));
