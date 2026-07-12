import { createRequire } from 'node:module';
import path from 'node:path';

const workspace = process.cwd();
const appDir = path.basename(workspace).toLowerCase() === 'app' ? workspace : path.join(workspace, 'app');
const require = createRequire(path.join(appDir, 'package.json'));
const { chromium } = require('@playwright/test');

const baseUrl = (process.argv[2] || process.env.LIVE_EMBED_BASE_URL || '').replace(/\/+$/, '');
const token = process.env.EMAILBUILDER_EMBED_TOKEN || '';

if (!baseUrl || token.length < 32) {
  console.error('Faltan LIVE_EMBED_BASE_URL/URL o EMAILBUILDER_EMBED_TOKEN.');
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });

  await page.goto(`${baseUrl}/embed#token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(`${baseUrl}/`, { timeout: 30_000 });
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ state: 'visible' });

  const cookie = (await context.cookies()).find(item => item.name === 'emailbuilder_embed');
  const apiResponse = await context.request.get(`${baseUrl}/api/settings`);
  const result = {
    finalUrl: page.url(),
    tokenRemoved: !page.url().includes('token='),
    cookie: cookie ? { httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite } : null,
    apiStatus: apiResponse.status(),
    consoleFailures: failures.length,
  };
  console.log(JSON.stringify(result));

  if (!result.tokenRemoved || !cookie?.httpOnly || !cookie.secure || cookie.sameSite !== 'None' || result.apiStatus !== 200 || failures.length) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(String(error).split(token).join('[REDACTED]'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
