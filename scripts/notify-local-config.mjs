/**
 * Local notify credentials (notify.local.json, gitignored).
 * Loaded by finresp-tech-log-server.mjs; written by ensure-notify-smtp.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const NOTIFY_ROOT = path.resolve(__dirname, '..');
export const NOTIFY_LOCAL_JSON = path.join(NOTIFY_ROOT, 'notify.local.json');
export const NOTIFY_EMAIL_CACHE_FILE = path.join(NOTIFY_ROOT, 'notify.email.cache.json');
export const ML_FINRESP_CONFIG_KEY = 'multilogic.finresp.config.v1';

export const MAILRU_SMTP_DEFAULTS = {
  smtpHost: 'smtp.mail.ru',
  smtpPort: 465,
  smtpSecure: true
};

export function readNotifyLocalJson() {
  if (!fs.existsSync(NOTIFY_LOCAL_JSON)) return null;
  try {
    return JSON.parse(fs.readFileSync(NOTIFY_LOCAL_JSON, 'utf8'));
  } catch (_) {
    return null;
  }
}

export function hasSavedSmtpCredentials() {
  const j = readNotifyLocalJson();
  return !!(j?.smtpUser && j?.smtpPass);
}

export function applyNotifyLocalJsonToEnv(env = process.env) {
  const j = readNotifyLocalJson();
  if (!j) return false;
  if (j.smtpHost && !env.ML_NOTIFY_SMTP_HOST) env.ML_NOTIFY_SMTP_HOST = j.smtpHost;
  if (j.smtpPort != null && !env.ML_NOTIFY_SMTP_PORT) env.ML_NOTIFY_SMTP_PORT = String(j.smtpPort);
  if (j.smtpSecure != null && !env.ML_NOTIFY_SMTP_SECURE) {
    env.ML_NOTIFY_SMTP_SECURE = j.smtpSecure ? 'true' : 'false';
  }
  if (j.smtpUser && !env.ML_NOTIFY_SMTP_USER) env.ML_NOTIFY_SMTP_USER = j.smtpUser;
  if (j.smtpPass && !env.ML_NOTIFY_SMTP_PASS) env.ML_NOTIFY_SMTP_PASS = j.smtpPass;
  if (j.smtpFrom && !env.ML_NOTIFY_SMTP_FROM) env.ML_NOTIFY_SMTP_FROM = j.smtpFrom;
  if (j.smsruApiId && !env.ML_NOTIFY_SMSRU_API_ID) env.ML_NOTIFY_SMSRU_API_ID = j.smsruApiId;
  return !!(env.ML_NOTIFY_SMTP_HOST && env.ML_NOTIFY_SMTP_USER && env.ML_NOTIFY_SMTP_PASS);
}

export function writeNotifyLocalJson(cfg) {
  fs.mkdirSync(path.dirname(NOTIFY_LOCAL_JSON), { recursive: true });
  const payload = {
    ...MAILRU_SMTP_DEFAULTS,
    ...cfg,
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(NOTIFY_LOCAL_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function verifyMailRuSmtp(cfg) {
  const host = cfg.smtpHost || MAILRU_SMTP_DEFAULTS.smtpHost;
  const port = Number(cfg.smtpPort ?? MAILRU_SMTP_DEFAULTS.smtpPort);
  const secure = cfg.smtpSecure !== false && (port === 465);
  const user = String(cfg.smtpUser || '').trim();
  const pass = String(cfg.smtpPass || '');
  if (!user || !pass) throw new Error('empty-credentials');
  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch (_) {
    throw new Error('nodemailer-missing');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
  await transporter.verify();
  return { host, port, secure, user };
}

export function isValidNotifyEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function readNotifyEmailCacheFile() {
  if (!fs.existsSync(NOTIFY_EMAIL_CACHE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(NOTIFY_EMAIL_CACHE_FILE, 'utf8'));
  } catch (_) {
    return null;
  }
}

export function writeNotifyEmailCache({ email, phone, source }) {
  const em = String(email || '').trim();
  const ph = String(phone || '').trim();
  if (!em && !ph) return;
  const prev = readNotifyEmailCacheFile() || {};
  const payload = {
    email: em || prev.email || '',
    phone: ph || prev.phone || '',
    source: source || prev.source || 'unknown',
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(NOTIFY_EMAIL_CACHE_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function readNotifyEmailFromLog() {
  const logPath = path.join(NOTIFY_ROOT, 'logs', 'finresp-notify.log');
  if (!fs.existsSync(logPath)) return '';
  const lines = fs.readFileSync(logPath, 'utf8').split('\n').reverse();
  for (const line of lines) {
    const m = line.match(/email=([^\s]+)/);
    if (m && m[1] !== '—' && isValidNotifyEmail(m[1])) return m[1].trim();
  }
  return '';
}

function extractNotifyEmailFromConfigBlob(text) {
  const notifyBlock = text.match(/"notify"\s*:\s*\{[\s\S]{0,400}?"email"\s*:\s*"([^"\\]+)"/);
  if (notifyBlock?.[1] && isValidNotifyEmail(notifyBlock[1])) return notifyBlock[1].trim();
  const keyIdx = text.indexOf(ML_FINRESP_CONFIG_KEY);
  if (keyIdx < 0) return '';
  const chunk = text.slice(keyIdx, keyIdx + 250000);
  const jsonStart = chunk.indexOf('{"');
  if (jsonStart < 0) return '';
  for (let end = jsonStart + 80; end <= chunk.length; end += 40) {
    try {
      const cfg = JSON.parse(chunk.slice(jsonStart, end));
      const em = cfg?.live?.notify?.email;
      if (isValidNotifyEmail(em)) return String(em).trim();
    } catch (_) { /* extend slice */ }
  }
  return '';
}

export function readNotifyEmailFromBrowserProfiles() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return '';
  const browserRoots = [
    path.join(localAppData, 'Microsoft', 'Edge', 'User Data'),
    path.join(localAppData, 'Google', 'Chrome', 'User Data')
  ];
  const profiles = ['Default', 'Profile 1', 'Profile 2', 'Profile 3'];
  for (const root of browserRoots) {
    for (const profile of profiles) {
      const dir = path.join(root, profile, 'Local Storage', 'leveldb');
      if (!fs.existsSync(dir)) continue;
      let names = [];
      try {
        names = fs.readdirSync(dir);
      } catch (_) {
        continue;
      }
      for (const name of names) {
        if (!/\.(log|ldb)$/i.test(name)) continue;
        const filePath = path.join(dir, name);
        let buf;
        try {
          buf = fs.readFileSync(filePath);
        } catch (_) {
          continue;
        }
        for (const enc of ['utf8', 'utf16le', 'latin1']) {
          const email = extractNotifyEmailFromConfigBlob(buf.toString(enc));
          if (email) return email;
        }
      }
    }
  }
  return '';
}

/** E-mail для подсказки в run-dev/run-prod (кэш → браузер → notify.log). */
export function readSuggestedNotifyEmail() {
  const cache = readNotifyEmailCacheFile();
  if (cache?.email && isValidNotifyEmail(cache.email)) return String(cache.email).trim();
  const fromBrowser = readNotifyEmailFromBrowserProfiles();
  if (fromBrowser) return fromBrowser;
  const fromLog = readNotifyEmailFromLog();
  if (fromLog) return fromLog;
  const local = readNotifyLocalJson();
  if (local?.smtpUser && isValidNotifyEmail(local.smtpUser)) return String(local.smtpUser).trim();
  return '';
}
