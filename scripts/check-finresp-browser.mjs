import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('http://127.0.0.1:4200/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL('**/finresp', { timeout: 30000 });

  await page.waitForSelector('#account-mode', { timeout: 60000 });
  await page.waitForFunction(
    () => !!(window.__mlFinrespVersion || window.__mlFinresp?.bootPhase === 'ok'),
    { timeout: 90000 }
  );

  const title = await page.locator('h1').first().textContent();
  const version = await page.evaluate(() => window.__mlFinrespVersion || null);
  const bootPhase = await page.evaluate(() => window.__mlFinresp?.bootPhase || null);
  const engine = await page.evaluate(() => !!window.MultiLogicFinrespEngine);

  console.log(JSON.stringify({
    url: page.url(),
    title: title?.trim(),
    version,
    bootPhase,
    engineLoaded: engine,
    pageErrors: errors,
  }, null, 2));

  await browser.close();
  if (!engine || errors.length) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
