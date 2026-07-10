import { describe, expect, it } from 'vitest';
import { createEmailDocument, documentToContent, isEmailDocumentV3, legacyContentToBlocks } from './email-document';
import { DEFAULT_BRAND, type Brand, type EmailContent } from './types';

const brand: Brand = { ...DEFAULT_BRAND, id: 'brand', name: 'Marca', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
const content: EmailContent = {
  subject: 'Asunto', preheader: 'Preheader', label: 'Etiqueta', headline: 'Titular', body: 'Cuerpo',
  bulletsTitle: 'Puntos', bullets: ['Uno'], ctaText: 'Ir', ctaUrl: 'https://example.com',
  eventDate: '', eventTime: '', preCta: '', footerNote: '',
};

describe('EmailDocumentV3', () => {
  it('adapts legacy drafts deterministically', () => {
    const blocks = legacyContentToBlocks(content);
    expect(blocks[0]).toEqual({ id: 'legacy-header', type: 'header' });
    expect(blocks.at(-1)?.type).toBe('footer');
    expect(blocks.some(block => block.type === 'cta')).toBe(true);
  });

  it('creates and restores the canonical document', () => {
    const document = createEmailDocument(brand, 'newsletter', content);
    expect(isEmailDocumentV3(document)).toBe(true);
    expect(document.schemaVersion).toBe(3);
    expect(document.compliance.unsubscribeUrl).toBe('{{unsubscribe}}');
    const restored = documentToContent(document);
    expect(restored.subject).toBe('Asunto');
    expect(restored.blocks).toEqual(document.blocks);
  });

  it('rejects incomplete lookalikes', () => {
    expect(isEmailDocumentV3({ schemaVersion: 3, brandId: 'x', blocks: [] })).toBe(false);
  });
});
