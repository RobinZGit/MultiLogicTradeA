/**
 * Interactive Mail.ru SMTP setup for local dev/prod bats.
 * Asks once; saves notify.local.json after successful verify.
 * Wrong password → message, no save; bat still continues.
 */
import readline from 'node:readline';
import {
  hasSavedSmtpCredentials,
  writeNotifyLocalJson,
  verifyMailRuSmtp,
  MAILRU_SMTP_DEFAULTS,
  readSuggestedNotifyEmail
} from './notify-local-config.mjs';

function promptLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || '').trim());
    });
  });
}

async function promptWithDefault(question, defaultValue) {
  const def = String(defaultValue || '').trim();
  const suffix = def ? ` [${def}]` : '';
  const answer = await promptLine(`${question}${suffix}: `);
  return answer || def;
}

async function main() {
  if (hasSavedSmtpCredentials()) {
    console.log('[notify] SMTP: учётные данные уже сохранены (notify.local.json).');
    process.exit(0);
    return;
  }

  console.log('');
  console.log('=== Рассылка e-mail (Mail.ru SMTP) ===');
  console.log('Пароль для внешнего приложения из настроек Mail.ru (не основной пароль).');
  console.log('Чтобы ввести заново — удалите файл notify.local.json в корне проекта.');
  console.log('');

  const suggestedEmail = readSuggestedNotifyEmail();
  if (suggestedEmail) {
    console.log(`[notify] Предложен e-mail из локального кэша: ${suggestedEmail}`);
  }

  const email = await promptWithDefault('E-mail Mail.ru (Enter — принять / пропустить)', suggestedEmail);
  if (!email) {
    console.log('[notify] Пропуск: рассылка на почту не настроена (только logs/finresp-notify.log).');
    process.exit(0);
    return;
  }

  const pass = await promptLine('Пароль приложения Mail.ru: ');
  if (!pass) {
    console.log('[notify] Пропуск: пароль не введён.');
    process.exit(0);
    return;
  }

  const cfg = {
    ...MAILRU_SMTP_DEFAULTS,
    smtpUser: email,
    smtpPass: pass,
    smtpFrom: email
  };

  try {
    await verifyMailRuSmtp(cfg);
  } catch (err) {
    const msg = err?.message || String(err);
    console.log('');
    console.log('[notify] Пароль неверен или SMTP недоступен:', msg);
    console.log('[notify] Сервер всё равно запустится, но письма на почту не уйдут.');
    process.exit(1);
    return;
  }

  writeNotifyLocalJson(cfg);
  console.log('');
  console.log('[notify] SMTP проверен. Пароль сохранён в notify.local.json (файл в .gitignore).');
  process.exit(0);
}

main().catch((err) => {
  console.error('[notify] Ошибка настройки:', err?.message || err);
  process.exit(1);
});
