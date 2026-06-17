/**
 * Local-only sink for FINRESP «Тех. информация» (browser → file in repo).
 * Started by run-dev.bat / run-prod.bat; listens on 127.0.0.1:4201 only.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 4201;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 512 * 1024;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'finresp-tech-log.txt');

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function allowOrigin(origin) {
  if (!origin) return `http://${HOST}:4200`;
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin) ? origin : `http://${HOST}:4200`;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': allowOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/finresp-tech-log')) {
    res.writeHead(200, { ...corsHeaders(origin), 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && req.url === '/finresp-tech-log') {
    try {
      const raw = await readBody(req);
      const data = JSON.parse(raw.toString('utf8'));
      const text = String(data.text || '').slice(0, MAX_BODY_BYTES);
      const header = [
        `# FINRESP tech log (local dev sink)`,
        `# updated=${data.at || new Date().toISOString()}`,
        `# lastEvent=${data.lastEvent || '—'}`,
        `# pageVersion=${data.pageVersion || '—'}`,
        `# url=${data.url || '—'}`,
        ''
      ].join('\n');
      ensureLogDir();
      fs.writeFileSync(LOG_FILE, `${header}${text}\n`, 'utf8');
      res.writeHead(200, { ...corsHeaders(origin), 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ok');
    } catch (err) {
      res.writeHead(400, { ...corsHeaders(origin), 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(err?.message || err));
    }
    return;
  }

  res.writeHead(404, corsHeaders(origin));
  res.end('not found');
});

server.listen(PORT, HOST, () => {
  ensureLogDir();
  console.log(`FINRESP tech log sink: http://${HOST}:${PORT}/finresp-tech-log`);
  console.log(`Writing snapshots to: ${LOG_FILE}`);
});

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is busy — tech log sink not started. Close the other process or change PORT.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
