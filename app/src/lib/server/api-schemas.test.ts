import { describe, expect, it } from 'vitest';
import { emailDocumentSchema, settingsPatchSchema } from './api-schemas';

const document = {
  schemaVersion: 3, brandId: 'brand', template: 'newsletter', subject: 'Asunto', preheader: 'Resumen', locale: 'es', emailWidth: 600,
  theme: { pageBackground: '#eef2f6', bodyBackground: '#ffffff', emailWidth: 600 },
  blocks: [{ id: 'header', type: 'header' }, { id: 'hero', type: 'hero', imageUrl: 'https://example.com/a.jpg', alt: 'Descripción' }, { id: 'footer', type: 'footer' }],
  compliance: { unsubscribeLabel: 'Cancelar suscripción', unsubscribeUrl: '{{unsubscribe}}', address: '{{location.full_address}}' },
};

describe('API schemas', () => {
  it('accepts a safe V3 document and documented merge fields', () => {
    expect(emailDocumentSchema.safeParse(document).success).toBe(true);
  });

  it('rejects missing alt text and dangerous URLs', () => {
    const invalid = structuredClone(document);
    invalid.blocks[1] = { ...invalid.blocks[1], imageUrl: 'javascript:alert(1)', alt: '' };
    expect(emailDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it('refuses attempts to store provider secrets', () => {
    expect(settingsPatchSchema.safeParse({ defaultEngine: 'gemini' }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ geminiApiKey: 'secret' }).success).toBe(false);
  });
});
