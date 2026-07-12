import { expect, test } from '@playwright/test';

test.describe('live AI smoke', () => {
  test.skip(process.env.RUN_LIVE_AI !== '1', 'Set RUN_LIVE_AI=1 explicitly to consume provider quota.');

  test('configured text providers return a persisted email document', async ({ request }) => {
    const brandsResponse = await request.get('/api/brands');
    expect(brandsResponse.ok()).toBe(true);
    const brands = await brandsResponse.json();
    expect(brands.length).toBeGreaterThan(0);

    const engines = (process.env.LIVE_AI_ENGINES || 'gemini').split(',').map(value => value.trim()).filter(Boolean);
    for (const engine of engines) {
      const response = await request.post('/api/generate', {
        data: {
          prompt: 'Crea un email breve y no sensible para verificar el proveedor. Usa copy de prueba sin datos personales.',
          templateType: 'newsletter', brandId: brands[0].id, engine,
        },
      });
      expect(response.ok(), `${engine}: ${await response.text()}`).toBe(true);
      const payload = await response.json();
      expect(payload.document?.schemaVersion).toBe(4);
      expect(payload.document?.blocks?.length).toBeGreaterThan(1);
      expect(payload.historySaved).toBe(true);
      expect(payload.engine).toBe(engine);
      expect(payload.model).toBeTruthy();
    }
  });
});
