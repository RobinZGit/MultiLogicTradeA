import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleLogs.push(`[pageerror] ${err}`));

  for (const url of ['http://127.0.0.1:4200/', 'http://127.0.0.1:4200/finresp']) {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();
    console.log('---', url, 'status', resp?.status(), 'final', page.url());
    console.log(bodyText.slice(0, 500));
    console.log('app-root html:', (await page.locator('app-root').innerHTML()).slice(0, 300));
  }
  console.log('console:', consoleLogs.slice(0, 20));
  await browser.close();
})();
