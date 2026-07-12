import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000, toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.02 } },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm.cmd run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      EMAILBUILDER_AUTH_BYPASS: 'true',
      EMAILBUILDER_EMBED_TOKEN: 'e2e-embed-secret-that-is-longer-than-32-characters',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    },
  },
});
