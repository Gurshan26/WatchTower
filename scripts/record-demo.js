const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.env.DEMO_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const WAIT = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name, desc) {
  const filepath = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`ok ${name}.png - ${desc}`);
  return filepath;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  console.log('WatchTower demo screenshots\n');

  await page.goto(`${BASE}/dashboard`);
  await WAIT(3000);
  await shot(page, '01-overview', 'Main overview dashboard');

  await page.goto(`${BASE}/dashboard/traces`);
  await WAIT(2000);
  await shot(page, '02-traces', 'Trace explorer');

  const traceLinks = await page.$$('a[href*="/traces/"]');
  if (traceLinks.length > 0) {
    await traceLinks[0].click();
    await WAIT(2000);
    await shot(page, '03-trace-waterfall', 'Trace waterfall view');

    const spanRows = await page.$$('[role="button"]');
    if (spanRows.length > 0) {
      await spanRows[0].click();
      await WAIT(500);
      await shot(page, '04-span-detail', 'Span detail panel open');
    }
  }

  await page.goto(`${BASE}/dashboard/logs`);
  await WAIT(1500);
  await shot(page, '05-logs', 'Log explorer');

  await page.goto(`${BASE}/dashboard/metrics`);
  await WAIT(2000);
  await shot(page, '06-metrics', 'Metrics charts');

  await page.goto(`${BASE}/dashboard/errors`);
  await WAIT(1500);
  await shot(page, '07-errors', 'Error tracking');

  await page.goto(`${BASE}/dashboard/chaos`);
  await WAIT(1500);
  await shot(page, '08-chaos-console', 'Chaos console');

  const triggerErrorBtn = await page.$('[data-action="error"]');
  if (triggerErrorBtn) {
    await triggerErrorBtn.click();
    await WAIT(500);
    await shot(page, '09-chaos-configured', 'Chaos error configured');

    const runBtn = await page.$('[data-action="run-chaos"]');
    if (runBtn) {
      await runBtn.click();
      await WAIT(3000);
      await shot(page, '10-chaos-result', 'Chaos error triggered - trace link shown');
    }
  }

  await page.goto(`${BASE}/dashboard`);
  await WAIT(3000);
  await shot(page, '11-overview-after-chaos', 'Overview after chaos events');

  await page.goto(`${BASE}/dashboard/traces`);
  await WAIT(1500);
  await shot(page, '12-traces-with-errors', 'Traces with chaos errors visible');

  console.log(`\n${fs.readdirSync(OUT).length} screenshots saved to docs/screenshots/`);
  await browser.close();
}

main().catch(console.error);
