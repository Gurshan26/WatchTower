const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.DEMO_URL || 'http://127.0.0.1:3000';
const OUT_DIR = path.join(ROOT, 'docs', 'demo');
const RAW_OUT_DIR = path.join(OUT_DIR, '.raw');
const VIEWPORT = { width: 1440, height: 900 };

const WAIT = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function nowStamp() {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function isServerUp() {
  try {
    const res = await fetch(`${BASE}/api/telemetry/overview`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServerReady(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await WAIT(1000);
  }
  return false;
}

async function ensureServer() {
  if (await isServerUp()) {
    console.log('[demo:video] Reusing running app:', BASE);
    return { managed: false, proc: null };
  }

  console.log('[demo:video] Starting dev server...');
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', (chunk) => {
    const text = String(chunk);
    if (text.includes('Ready') || text.includes('ready')) {
      process.stdout.write(`[dev] ${text}`);
    }
  });

  proc.stderr.on('data', (chunk) => {
    const text = String(chunk);
    if (text.trim()) process.stderr.write(`[dev] ${text}`);
  });

  const ready = await waitForServerReady();
  if (!ready) {
    proc.kill('SIGINT');
    throw new Error(`Timed out waiting for ${BASE}`);
  }

  console.log('[demo:video] Dev server ready');
  return { managed: true, proc };
}

async function stopServer(proc) {
  if (!proc) return;
  proc.kill('SIGINT');

  await Promise.race([
    new Promise((resolve) => proc.once('exit', resolve)),
    WAIT(5000),
  ]);

  if (!proc.killed) {
    proc.kill('SIGKILL');
  }
}

async function pickTraceLink(page) {
  const rowLink = page.locator('table tbody a[href^="/dashboard/traces/"]').first();
  if ((await rowLink.count()) === 0) return false;
  await rowLink.click();
  await page.waitForLoadState('networkidle');
  return true;
}

async function openTraceFromChaosResult(page) {
  const link = page.locator('a', { hasText: 'View trace' }).first();
  if ((await link.count()) === 0) return false;

  await link.click();
  await page.waitForLoadState('networkidle');
  await WAIT(900);

  const firstSpan = page.locator('[role="button"]').first();
  if ((await firstSpan.count()) > 0) {
    await firstSpan.click();
    await WAIT(900);
  }

  return true;
}

async function setSelectValue(page, value) {
  await page.evaluate((nextValue) => {
    const selects = Array.from(document.querySelectorAll('select'));
    const target = selects.find((s) => Array.from(s.options).some((o) => o.value === nextValue));
    if (!target) return;
    target.value = nextValue;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function setRangeValues(page, values) {
  await page.evaluate((nextValues) => {
    const ranges = Array.from(document.querySelectorAll('input[type="range"]'));
    nextValues.forEach((value, idx) => {
      if (!ranges[idx]) return;
      ranges[idx].value = String(value);
      ranges[idx].dispatchEvent(new Event('input', { bubbles: true }));
      ranges[idx].dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, values);
}

async function runChaosAction(page, actionId, configure = null, waitMs = 3000) {
  await page.click(`[data-action="${actionId}"]`);
  await WAIT(700);

  if (configure) {
    await configure();
    await WAIT(500);
  }

  await page.click('[data-action="run-chaos"]');
  await WAIT(waitMs);
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(RAW_OUT_DIR, { recursive: true });

  const { managed, proc } = await ensureServer();

  let browser;
  let context;
  let page;
  let savedPath = null;

  try {
    const chromePath = puppeteer.executablePath();
    browser = await chromium.launch({
      headless: process.env.DEMO_HEADFUL === '1' ? false : true,
      executablePath: chromePath,
      args: [`--window-size=${VIEWPORT.width},${VIEWPORT.height}`],
      slowMo: 60,
    });

    context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: {
        dir: RAW_OUT_DIR,
        size: VIEWPORT,
      },
    });

    page = await context.newPage();

    console.log('[demo:video] Recording started');

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await WAIT(2200);

    await page.goto(`${BASE}/dashboard/traces`, { waitUntil: 'domcontentloaded' });
    await WAIT(1400);

    const openedTrace = await pickTraceLink(page);
    if (openedTrace) {
      await WAIT(1200);
      const firstSpan = page.locator('[role="button"]').first();
      if ((await firstSpan.count()) > 0) {
        await firstSpan.click();
        await WAIT(1200);
      }
    }

    await page.goto(`${BASE}/dashboard/logs`, { waitUntil: 'domcontentloaded' });
    await WAIT(1200);
    await setSelectValue(page, 'ERROR');
    await page.fill('input[placeholder="Search log body"]', 'Chaos');
    await WAIT(1800);

    await page.goto(`${BASE}/dashboard/metrics`, { waitUntil: 'domcontentloaded' });
    await WAIT(1400);
    await setSelectValue(page, 'errors.total');
    await WAIT(1500);
    await setSelectValue(page, 'memory.used_mb');
    await WAIT(1500);

    await page.goto(`${BASE}/dashboard/errors`, { waitUntil: 'domcontentloaded' });
    await WAIT(1800);

    await page.goto(`${BASE}/dashboard/chaos`, { waitUntil: 'domcontentloaded' });
    await WAIT(1200);

    await runChaosAction(
      page,
      'error',
      async () => {
        await setSelectValue(page, 'rate_limit');
        await page.fill('input[type="number"][min="1"][max="10"]', '2');
      },
      3500
    );

    if (await openTraceFromChaosResult(page)) {
      await page.goto(`${BASE}/dashboard/chaos`, { waitUntil: 'domcontentloaded' });
      await WAIT(900);
    }

    await runChaosAction(
      page,
      'slow',
      async () => {
        await setRangeValues(page, [2800, 4]);
      },
      4500
    );

    if (await openTraceFromChaosResult(page)) {
      await page.goto(`${BASE}/dashboard/chaos`, { waitUntil: 'domcontentloaded' });
      await WAIT(900);
    }

    await runChaosAction(page, 'cascade', null, 3000);
    if (await openTraceFromChaosResult(page)) {
      await page.goto(`${BASE}/dashboard/chaos`, { waitUntil: 'domcontentloaded' });
      await WAIT(900);
    }

    await runChaosAction(page, 'http-fail', null, 3500);
    if (await openTraceFromChaosResult(page)) {
      await page.goto(`${BASE}/dashboard/chaos`, { waitUntil: 'domcontentloaded' });
      await WAIT(900);
    }

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await WAIT(3500);

    await page.goto(`${BASE}/dashboard/traces`, { waitUntil: 'domcontentloaded' });
    await WAIT(2400);

    const video = page.video();
    await context.close();

    const finalPath = path.join(OUT_DIR, `watchtower-demo-${nowStamp()}.webm`);
    await video.saveAs(finalPath);
    await video.delete();
    savedPath = finalPath;

    await browser.close();

    console.log('[demo:video] Recording complete');
    console.log('[demo:video] Video file:', finalPath);
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {}
    }
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    if (managed) {
      await stopServer(proc);
    }
  }

  return savedPath;
}

run()
  .then((file) => {
    if (!file) process.exitCode = 1;
  })
  .catch((err) => {
    console.error('[demo:video] Failed:', err.message);
    process.exitCode = 1;
  });
