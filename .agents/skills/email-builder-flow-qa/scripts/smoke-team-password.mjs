import { createRequire } from 'node:module';
import path from 'node:path';

const workspace = process.cwd();
const appDir = path.basename(workspace).toLowerCase() === 'app' ? workspace : path.join(workspace, 'app');
const require = createRequire(path.join(appDir, 'package.json'));
const { chromium } = require('@playwright/test');

const baseUrl = (process.argv[2] || process.env.LIVE_TEAM_BASE_URL || '').replace(/\/+$/, '');
const password = process.env.EMAILBUILDER_TEAM_PASSWORD || '';

if (!baseUrl || password.length < 16) {
  console.error('Faltan LIVE_TEAM_BASE_URL/URL o EMAILBUILDER_TEAM_PASSWORD.');
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });

  await page.goto(`${baseUrl}/login?next=/`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Contraseña del equipo').fill(password);
  const authResponsePromise = page.waitForResponse(
    response => new URL(response.url()).pathname === '/api/auth/team',
    { timeout: 10_000 },
  ).catch(() => null);
  await page.getByRole('button', { name: 'Entrar al workspace' }).click();
  const authResponse = await authResponsePromise;
  if (!authResponse) {
    throw new Error(JSON.stringify({
      reason: 'team auth request was not observed',
      currentUrl: page.url(),
      passwordInputCount: await page.getByLabel('Contraseña del equipo').count(),
      submitDisabled: await page.getByRole('button', { name: /Entrar al workspace|Validando acceso/ }).isDisabled().catch(() => null),
      browserFailures: failures,
    }));
  }
  await page.waitForURL(`${baseUrl}/`, { timeout: 30_000 }).catch(() => undefined);

  if (page.url() !== `${baseUrl}/`) {
    const cookie = (await context.cookies()).find(item => item.name === 'emailbuilder_team');
    throw new Error(JSON.stringify({
      authStatus: authResponse.status(),
      currentUrl: page.url(),
      cookie: cookie ? { domain: cookie.domain, path: cookie.path, httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite } : null,
    }));
  }
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ state: 'visible' });

  const cookie = (await context.cookies()).find(item => item.name === 'emailbuilder_team');
  const authenticatedResponse = await context.request.get(`${baseUrl}/api/settings`);
  const logoutResponse = await context.request.delete(`${baseUrl}/api/auth/team`);
  const anonymousResponse = await context.request.get(`${baseUrl}/api/settings`);
  const result = {
    finalUrl: page.url(),
    cookie: cookie ? { httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite } : null,
    authenticatedApiStatus: authenticatedResponse.status(),
    logoutStatus: logoutResponse.status(),
    anonymousApiStatus: anonymousResponse.status(),
    consoleFailures: failures.length,
  };
  console.log(JSON.stringify(result));

  if (!cookie?.httpOnly || !cookie.secure || cookie.sameSite !== 'Lax' || authenticatedResponse.status() !== 200 || logoutResponse.status() !== 200 || anonymousResponse.status() !== 401 || failures.length) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(String(error).split(password).join('[REDACTED]'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
