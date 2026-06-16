import { chromium } from 'playwright';

const url = process.argv[2] || 'https://robinzgit.github.io/MultiLogicTradeA/finresp';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('#account-mode', { timeout: 120000 });
  await page.waitForFunction(
    () => !!(window.__mlFinrespVersion || window.__mlFinresp?.bootPhase === 'ok'),
    { timeout: 120000 }
  );

  const title = await page.locator('h1').first().textContent();
  const version = await page.evaluate(() => window.__mlFinrespVersion || null);
  const engine = await page.evaluate(() => !!window.MultiLogicFinrespEngine);

  console.log(JSON.stringify({
    requested: url,
    finalUrl: page.url(),
    httpStatus: resp?.status() ?? null,
    title: title?.trim(),
    version,
    engineLoaded: engine,
    pageErrors: errors,
  }, null, 2));

  await browser.close();
  if (!engine || errors.length) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
