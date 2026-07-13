import { expect, test } from '@playwright/test';

const browserFailures = new WeakMap<import('@playwright/test').Page, string[]>();

const testBrand = {
  id: 'test-brand', name: 'AD Media Solution', category: 'Marketing', isFavorite: true,
  colors: { primary: '#0b2a4a', accent: '#29abe2', gradientStart: '#29abe2', gradientEnd: '#1b6fc4' },
  fonts: { heading: 'Arial', body: 'Verdana' }, logo: { type: 'text', value: 'AD|Media' },
  footer: { tagline: 'Growth Marketing', subtitle: '', disclaimer: '', address: '{{location.full_address}}', unsubscribeLabel: 'Cancelar suscripción', unsubscribeUrl: '{{unsubscribe}}' },
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const generatedDocument = {
  schemaVersion: 4, brandId: testBrand.id, template: 'newsletter', presetId: 'editorial-digest',
  subject: 'Asunto generado', preheader: 'Resumen generado', locale: 'es', emailWidth: 600,
  theme: {
    pageBackground: '#eef2f6', bodyBackground: '#ffffff', emailWidth: 600,
    typography: { headingFont: 'Arial', bodyFont: 'Verdana', headingColor: '#0b2a4a', bodyColor: '#425466', mutedColor: '#7a8792', linkColor: '#29abe2', ctaTextColor: '#ffffff' },
    primaryColor: '#0b2a4a', accentColor: '#29abe2', gradientStart: '#29abe2', gradientEnd: '#1b6fc4', headerBackground: '#0b2a4a', footerBackground: '#0b2a4a',
  },
  blocks: [
    { id: 'header', type: 'header' },
    { id: 'text', type: 'text', label: 'Novedad', headline: 'Un email claro', body: 'Contenido generado para la prueba.' },
    { id: 'cta', type: 'cta', ctaText: 'Ver más', ctaUrl: 'https://example.com' },
    { id: 'footer', type: 'footer', footerNote: 'Información' },
  ],
  compliance: { unsubscribeLabel: 'Cancelar suscripción', unsubscribeUrl: '{{unsubscribe}}', address: '{{location.full_address}}' },
};

function generatedContent() {
  return {
    subject: generatedDocument.subject, preheader: generatedDocument.preheader, emailWidth: 600,
    emailBgColor: '#eef2f6', bodyBgColor: '#ffffff', presetId: 'editorial-digest',
    typography: generatedDocument.theme.typography, primaryColor: '#0b2a4a', accentColor: '#29abe2',
    gradientStart: '#29abe2', gradientEnd: '#1b6fc4', headerBgColor: '#0b2a4a', footerBgColor: '#0b2a4a',
    blocks: structuredClone(generatedDocument.blocks), compliance: generatedDocument.compliance,
  };
}

async function mockWorkspace(page: import('@playwright/test').Page) {
  await page.route('**/api/brands', route => route.fulfill({ json: [testBrand] }));
  await page.route('**/api/drafts', route => route.fulfill({ json: [] }));
  await page.route('**/api/offers?*', route => route.fulfill({ json: [] }));
  await page.route('**/api/settings', route => route.fulfill({ json: {
    hasGeminiKey: true, hasGroqKey: true, hasAnthropicKey: false, defaultEngine: 'gemini',
    assetsPublicBaseUrl: '', supabaseAssetsBaseUrl: '',
  } }));
}

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
  const failures: string[] = [];
  browserFailures.set(page, failures);
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });
  page.on('requestfailed', request => {
    const reason = request.failure()?.errorText || '';
    if (reason.includes('ERR_ABORTED')) return;
    failures.push(`request: ${request.method()} ${request.url()} ${reason}`);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.afterEach(async ({ page }) => {
  expect(browserFailures.get(page) || []).toEqual([]);
});

async function settleForScreenshot(page: import('@playwright/test').Page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
}

test('GHL embed exchanges the URL fragment for a secure session without showing login', async ({ page, context }) => {
  await page.goto('/embed#token=e2e-embed-secret-that-is-longer-than-32-characters');
  await expect(page).toHaveURL('http://localhost:3000/');
  expect(page.url()).not.toContain('token=');

  const sessionCookie = (await context.cookies()).find(cookie => cookie.name === 'emailbuilder_embed');
  expect(sessionCookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'None' });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('team password opens a direct private session', async ({ page, context }) => {
  await page.goto('/login?next=/editor', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Entra a tu workspace' })).toBeVisible();
  await expect(page.getByText(/No hay registro p.blico/)).toBeVisible();
  await expect(page.getByLabel('Contraseña del equipo')).toBeVisible();
  await expectNoPageOverflow(page);
  await settleForScreenshot(page);
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });

  await page.getByLabel('Contraseña del equipo').fill('e2e-team-password-that-is-longer-than-16');
  await page.getByRole('button', { name: 'Entrar al workspace' }).click();
  await expect(page).toHaveURL('http://localhost:3000/editor');
  const sessionCookie = (await context.cookies()).find(cookie => cookie.name === 'emailbuilder_team');
  expect(sessionCookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' });
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
  await mockWorkspace(page);
  await page.route('**/api/history?*', route => route.fulfill({ json: [] }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await settleForScreenshot(page);
  await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });

  await page.goto('/editor', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Email Editor' })).toBeVisible();
  await settleForScreenshot(page);
  await expect(page).toHaveScreenshot('editor.png', { fullPage: true });

  await page.goto('/brands?action=new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Nueva marca/i })).toBeVisible();
  await expectNoPageOverflow(page);
  await settleForScreenshot(page);
  await expect(page).toHaveScreenshot('brand-modal.png', { fullPage: true });
});

test('preset, contextual inspector and undo work together', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('**/api/offers?*', route => route.fulfill({ json: [] }));
  await page.route('**/api/brands', route => route.fulfill({ json: [{
    id: 'test-brand', name: 'AD Media Solution', category: 'Marketing', isFavorite: true,
    colors: { primary: '#0b2a4a', accent: '#29abe2', gradientStart: '#29abe2', gradientEnd: '#1b6fc4' },
    fonts: { heading: 'Arial', body: 'Verdana' }, logo: { type: 'text', value: 'AD|Media' },
    footer: { tagline: 'Growth Marketing', subtitle: '', disclaimer: '', address: '{{location.full_address}}', unsubscribeLabel: 'Cancelar suscripción', unsubscribeUrl: '{{unsubscribe}}' },
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  }] }));
  await page.goto('/editor', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Keynote Editorial' }).click();
  await expect(page.getByRole('heading', { name: /Canvas Visual/ })).toBeVisible();
  await page.frameLocator('iframe').getByText('• Una propuesta más clara', { exact: true }).click();
  await expect(page.locator('.canvas-block-card.is-active .block-type-badge')).toHaveText('Bullets');
  const textColor = page.getByRole('region', { name: 'Estilo del bloque' }).getByLabel('Texto', { exact: true });
  await textColor.fill('#24566f');
  await expect(textColor).toHaveValue('#24566f');
  await expect(page.getByRole('button', { name: '↩️' })).toBeEnabled();
});

test('inline AI and preview click focus the exact canvas field', async ({ page }) => {
  await mockWorkspace(page);
  await page.route('**/api/history?*', route => route.fulfill({ json: [] }));
  await page.route('**/api/refine', async route => {
    const body = route.request().postDataJSON();
    expect(body.command).toBe('optimize');
    expect(body.field).toBe('headline');
    await route.fulfill({ json: { result: 'Titular refinado por IA' } });
  });
  await page.goto('/editor?brand=test-brand', { waitUntil: 'domcontentloaded' });
  const headline = page.locator('#content-headline');
  await headline.fill('Titular original');
  const group = headline.locator('..');
  await group.getByRole('button', { name: 'IA' }).click();
  await page.getByRole('menuitem', { name: 'Optimizar' }).click();
  await expect(headline).toHaveValue('Titular refinado por IA');

  const previewHeadline = page.frameLocator('iframe[title="Email Preview"]').locator('[data-editor-field$="-headline"]');
  await previewHeadline.click();
  await expect(page.locator('[data-block-field="headline"] input')).toBeFocused();
  await expect(page.locator('[data-block-field="headline"] input')).toHaveValue('Titular refinado por IA');
});

test('generate, autosave, library and reopen preserve the latest content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockWorkspace(page);
  let entry = {
    id: 'history-1', brandId: testBrand.id, templateType: 'newsletter', engine: 'gemini', model: 'gemini-2.5-flash',
    prompt: 'Crea un newsletter', subject: generatedDocument.subject, content: generatedContent(), htmlSnapshot: '<html>inicial</html>',
    rating: null, notes: '', createdAt: '2026-07-12T12:00:00.000Z', updatedAt: '2026-07-12T12:00:00.000Z',
  };

  await page.route('**/api/generate', route => route.fulfill({ json: {
    document: generatedDocument, historyId: entry.id, historyEntry: entry, historySaved: true, engine: 'gemini', model: 'gemini-2.5-flash',
  } }));
  await page.route('**/api/history?*', route => route.fulfill({ json: [entry] }));
  await page.route('**/api/history/history-1**', async route => {
    if (route.request().method() === 'PATCH') {
      const update = route.request().postDataJSON();
      entry = { ...entry, ...update, updatedAt: '2026-07-12T12:01:00.000Z' };
      await route.fulfill({ json: entry });
      return;
    }
    await route.fulfill({ json: entry });
  });

  await page.goto('/editor', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Generar con IA/ }).click();
  await page.getByLabel('¿De qué trata este correo?').fill('Crea un newsletter de prueba');
  await page.getByRole('button', { name: 'Generar Email' }).click();
  await expect(page.getByLabel('✉️ Asunto')).toHaveValue('Asunto generado');
  await page.getByLabel('✉️ Asunto').fill('Asunto editado y guardado');
  await expect(page.getByRole('status')).toContainText('Guardado', { timeout: 8_000 });

  await page.getByRole('button', { name: /Biblioteca/ }).click();
  await expect(page.getByText('Asunto editado y guardado')).toBeVisible();

  await page.goto(`/editor?emailId=${entry.id}&brandId=${entry.brandId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('✉️ Asunto')).toHaveValue('Asunto editado y guardado');
});

test('transparent logo upload is classified and previewed on three surfaces', async ({ page }) => {
  await mockWorkspace(page);
  await page.route('**/api/assets', async route => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ json: { assets: [] } });
      return;
    }
    await route.fulfill({ json: { asset: {
      id: 'logo-1', filename: 'logo.png', brandId: 'new-brand',
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/3p7nWQAAAABJRU5ErkJggg==',
      thumbnailUrl: '', size: 68, modifiedAt: '2026-07-12T00:00:00.000Z', kind: 'logo', altText: 'Logo transparente',
      width: 1, height: 1, mimeType: 'image/png', hasAlpha: true, variant: 'email', author: 'QA', createdAt: '2026-07-12T00:00:00.000Z',
    } } });
  });

  await page.goto('/brands?action=new', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Imagen/ }).click();
  await page.locator('input[type="file"][accept*=".png"]').setInputFiles({
    name: 'logo.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/3p7nWQAAAABJRU5ErkJggg==', 'base64'),
  });
  await expect(page.getByText('Transparencia detectada')).toBeVisible();
  await expect(page.getByAltText(/Logo sobre fondo/)).toHaveCount(3);
});
