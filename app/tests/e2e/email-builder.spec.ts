import { expect, test } from '@playwright/test';

async function expectNoPageOverflow(page: import('@playwright/test').Page) {
  const report = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
        scrollWidth: element.scrollWidth,
      }))
      .filter(item => item.right > viewport + 1 || item.scrollWidth > Math.max(viewport, item.width) + 1)
      .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
      .slice(0, 6);
    return { viewport, page: document.documentElement.scrollWidth, body: document.body.scrollWidth, offenders };
  });
  expect(report.page, JSON.stringify(report)).toBeLessThanOrEqual(report.viewport);
  expect(report.body, JSON.stringify(report)).toBeLessThanOrEqual(report.viewport);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('private login has no public registration', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Entra a tu workspace' })).toBeVisible();
  await expect(page.getByText(/No hay registro p.blico/)).toBeVisible();
  await expectNoPageOverflow(page);
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
]) {
  test(`dashboard and editor stay inside ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expectNoPageOverflow(page);
    await page.goto('/editor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Email Editor' })).toBeVisible();
    await expectNoPageOverflow(page);
  });
}

test('dashboard, editor, brand modal and asset library visual states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });

  await page.goto('/editor', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Email Editor' })).toBeVisible();
  await expect(page).toHaveScreenshot('editor.png', { fullPage: true });

  await page.goto('/brands?action=new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Nueva marca/i })).toBeVisible();
  await expectNoPageOverflow(page);
  await expect(page).toHaveScreenshot('brand-modal.png', { fullPage: true });
});
