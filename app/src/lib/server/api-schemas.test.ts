import { describe, expect, it } from 'vitest';
import { brandAnalysisSchema, emailDocumentSchema, offerInputSchema, settingsPatchSchema } from './api-schemas';

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
    expect(settingsPatchSchema.safeParse({ defaultEngine: 'groq' }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ geminiApiKey: 'secret' }).success).toBe(false);
  });

  it('validates configurable divider fields', () => {
    const valid = {
      ...structuredClone(document),
      blocks: [document.blocks[0], { id: 'divider', type: 'divider', color: '#ff5500', thickness: 4, lineStyle: 'dashed', ornament: '✦' }, ...document.blocks.slice(1)],
    };
    expect(emailDocumentSchema.safeParse(valid).success).toBe(true);

    const invalid = { ...valid, blocks: valid.blocks.map((block, index) => index === 1 ? { ...block, thickness: 9 } : block) };
    expect(emailDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates badge fields and requires text', () => {
    const valid = {
      ...structuredClone(document),
      blocks: [document.blocks[0], { id: 'badge', type: 'badge', text: 'NUEVO', emoji: '✨', bgColor: '#aa1122', textColor: '#ffffff', align: 'center' }, ...document.blocks.slice(1)],
    };
    expect(emailDocumentSchema.safeParse(valid).success).toBe(true);

    const invalid = { ...valid, blocks: valid.blocks.map((block, index) => index === 1 ? { ...block, text: '' } : block) };
    expect(emailDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates callout fields and full hex colors', () => {
    const valid = {
      ...structuredClone(document),
      blocks: [document.blocks[0], { id: 'callout', type: 'callout', emoji: '⚠️', title: 'Aviso', body: 'Contenido', bgColor: '#f2dbde', accentColor: '#aa1122' }, ...document.blocks.slice(1)],
    };
    expect(emailDocumentSchema.safeParse(valid).success).toBe(true);

    const invalid = { ...valid, blocks: valid.blocks.map((block, index) => index === 1 ? { ...block, accentColor: '#bad' } : block) };
    expect(emailDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates general and per-bullet markers', () => {
    const valid = {
      ...structuredClone(document),
      blocks: [document.blocks[0], { id: 'bullets', type: 'bullets', bullets: ['Uno', 'Dos'], marker: '•', perBulletMarker: ['✅', '✅'] }, ...document.blocks.slice(1)],
    };
    expect(emailDocumentSchema.safeParse(valid).success).toBe(true);

    const invalid = { ...valid, blocks: valid.blocks.map((block, index) => index === 1 ? { ...block, marker: 'x'.repeat(33) } : block) };
    expect(emailDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates configurable CTA appearance', () => {
    const valid = {
      ...structuredClone(document),
      blocks: [document.blocks[0], {
        id: 'cta', type: 'cta', ctaText: 'Comprar', ctaUrl: 'https://example.com',
        ctaBgColor: '#112233', ctaTextColor: '#ffeeaa', ctaRadius: 20, ctaFullWidth: true, ctaSize: 'lg',
      }, ...document.blocks.slice(1)],
    };
    expect(emailDocumentSchema.safeParse(valid).success).toBe(true);

    const invalid = { ...valid, blocks: valid.blocks.map((block, index) => index === 1 ? { ...block, ctaRadius: 29 } : block) };
    expect(emailDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates reusable offers and bounded brand analysis sources', () => {
    expect(offerInputSchema.safeParse({ brandId: 'brand', name: 'Promo', type: 'percent', value: '30% OFF', currency: 'USD', terms: '', audience: '', urgency: '', landingUrl: 'https://example.com', status: 'active' }).success).toBe(true);
    expect(brandAnalysisSchema.safeParse({ url: 'https://example.com', additionalUrls: [], notes: '' }).success).toBe(true);
    expect(brandAnalysisSchema.safeParse({ url: 'file:///secret', additionalUrls: [], notes: '' }).success).toBe(false);
  });
});
