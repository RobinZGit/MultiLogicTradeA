/**
 * Local-only services for FINRESP (browser → files in repo).
 * Started by run-dev.bat / run-prod.bat; listens on 127.0.0.1:4201 only.
 *
 * Endpoints:
 *   POST /finresp-tech-log  — mirror «Тех. информация»
 *   POST /finresp-notify    — email/SMS alerts (also logs to logs/finresp-notify.log)
 *
 * Optional env for real delivery:
 *   ML_NOTIFY_SMSRU_API_ID   — SMS.ru API id (Russia +7)
 *   ML_NOTIFY_SMTP_HOST, ML_NOTIFY_SMTP_PORT, ML_NOTIFY_SMTP_USER, ML_NOTIFY_SMTP_PASS, ML_NOTIFY_SMTP_FROM
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.FINRESP_LOCAL_PORT) || 4201;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 512 * 1024;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'finresp-tech-log.txt');
const NOTIFY_LOG_FILE = path.join(LOG_DIR, 'finresp-notify.log');

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function appendNotifyLog(line) {
  ensureLogDir();
  fs.appendFileSync(NOTIFY_LOG_FILE, `${line}\n`, 'utf8');
}

function normalizeRuPhoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return digits;
  if (digits.length === 10) return `7${digits}`;
  return null;
}

async function sendSmsRu(phone, message) {
  const apiId = process.env.ML_NOTIFY_SMSRU_API_ID;
  if (!apiId) return { ok: false, skipped: true, reason: 'no-smsru-api' };
  const to = normalizeRuPhoneDigits(phone);
  if (!to) return { ok: false, skipped: true, reason: 'bad-phone' };
  const params = new URLSearchParams({
    api_id: apiId,
    to,
    msg: String(message || '').slice(0, 1000),
    json: '1'
  });
  const res = await fetch(`https://sms.ru/sms/send?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  const entry = data?.sms?.[to];
  const ok = entry?.status === 'OK' || entry?.status_code === 100;
  return { ok, data };
}

async function sendEmailSmtp(to, subject, text) {
  const host = process.env.ML_NOTIFY_SMTP_HOST;
  const from = process.env.ML_NOTIFY_SMTP_FROM || process.env.ML_NOTIFY_SMTP_USER;
  if (!host || !from || !to) return { ok: false, skipped: true, reason: 'no-smtp' };
  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch (_) {
    return { ok: false, skipped: true, reason: 'nodemailer-missing' };
  }
  const port = Number(process.env.ML_NOTIFY_SMTP_PORT || 587);
  const secure = process.env.ML_NOTIFY_SMTP_SECURE === 'true' || port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: process.env.ML_NOTIFY_SMTP_USER
      ? { user: process.env.ML_NOTIFY_SMTP_USER, pass: process.env.ML_NOTIFY_SMTP_PASS || '' }
      : undefined
  });
  const info = await transporter.sendMail({
    from,
    to,
    subject: String(subject || 'MultiLogic notify').slice(0, 200),
    text: String(text || '')
  });
  return { ok: true, messageId: info?.messageId || null };
}

async function handleNotifyRequest(data) {
  const event = String(data.event || 'unknown');
  const subject = String(data.subject || 'MultiLogic');
  const message = String(data.message || '');
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const emailEnabled = !!data.emailEnabled && !!email;
  const phoneEnabled = !!data.phoneEnabled && !!phone;
  const stamp = data.at || new Date().toISOString();
  const results = { event, email: null, sms: null, logged: true };

  appendNotifyLog(`[${stamp}] event=${event} email=${emailEnabled ? email : '—'} phone=${phoneEnabled ? phone : '—'}`);
  appendNotifyLog(`  subject=${subject}`);
  appendNotifyLog(`  ${message.replace(/\r?\n/g, ' ')}`);

  if (emailEnabled) {
    try {
      results.email = await sendEmailSmtp(email, subject, message);
    } catch (err) {
      results.email = { ok: false, error: String(err?.message || err) };
      appendNotifyLog(`  email-error=${results.email.error}`);
    }
  }
  if (phoneEnabled) {
    try {
      const smsText = `${subject}\n${message}`.slice(0, 1000);
      results.sms = await sendSmsRu(phone, smsText);
    } catch (err) {
      results.sms = { ok: false, error: String(err?.message || err) };
      appendNotifyLog(`  sms-error=${results.sms.error}`);
    }
  }

  return results;
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

  if (req.method === 'GET' && req.url === '/finresp-notify-health') {
    res.writeHead(200, { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      smtp: !!process.env.ML_NOTIFY_SMTP_HOST,
      smsru: !!process.env.ML_NOTIFY_SMSRU_API_ID,
      logFile: NOTIFY_LOG_FILE
    }));
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

  if (req.method === 'POST' && req.url === '/finresp-notify') {
    try {
      const raw = await readBody(req);
      const data = JSON.parse(raw.toString('utf8'));
      const results = await handleNotifyRequest(data);
      res.writeHead(200, { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, results }));
    } catch (err) {
      res.writeHead(400, { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
    }
    return;
  }

  res.writeHead(404, corsHeaders(origin));
  res.end('not found');
});

server.listen(PORT, HOST, () => {
  ensureLogDir();
  console.log(`FINRESP local server: http://${HOST}:${PORT}`);
  console.log(`  tech log → ${LOG_FILE}`);
  console.log(`  notify   → ${NOTIFY_LOG_FILE}`);
  if (process.env.ML_NOTIFY_SMSRU_API_ID) console.log('  SMS.ru: configured');
  if (process.env.ML_NOTIFY_SMTP_HOST) console.log('  SMTP: configured');
});

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is busy — tech log sink not started. Close the other process or change PORT.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
