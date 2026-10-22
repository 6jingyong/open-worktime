#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

export function createPreviewServer() {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    let path;
    try {
      path = decodeURIComponent(request.url.split('?')[0]);
    } catch {
      response.writeHead(400).end('Invalid URL');
      return;
    }
    if (path === '/') path = '/index.html';
    const parts = path.split('/').slice(1);
    const publicPath = parts.length === 1
      ? /\.(html|css|js|mjs)$/.test(parts[0]) || ['README.md', 'LICENSE'].includes(parts[0])
      : ['data', 'docs'].includes(parts[0]);
    if (!path.startsWith('/') || /[\\:\u0000]/.test(path) ||
        parts.some(part => !part || part.startsWith('.')) || !publicPath) {
      response.writeHead(404).end('Not found');
      return;
    }

    try {
      const bytes = await readFile(resolve(root, ...parts));
      response.writeHead(200, {
        'Content-Type': contentTypes[extname(path)] ?? 'text/plain; charset=utf-8',
        'Content-Length': bytes.length
      });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      const status = ['ENOENT', 'ENOTDIR', 'EISDIR', 'EACCES'].includes(error.code) ? 404 : 500;
      response.writeHead(status).end(status === 404 ? 'Not found' : 'Could not read file');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exitCode = 1;
  } else {
    const server = createPreviewServer();
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? `Port ${port} is already in use. Set PORT to another port and try again.`
        : error.message);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`Open Worktime: http://127.0.0.1:${port}`);
      console.log(`Partner preview: http://127.0.0.1:${port}/partners.html#preview`);
      console.log('Static preview only. Press Ctrl+C to stop.');
    });
  }
}
