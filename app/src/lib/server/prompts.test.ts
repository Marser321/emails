import { describe, expect, it } from 'vitest';
import { buildBrandIntelligenceBlock, buildExamplesBlock, refineCommandPrompt } from './prompts';
import type { Brand, EmailHistoryEntry } from '@/lib/types';

const makeEntry = (rating: 'up' | 'down' | null, headline: string): EmailHistoryEntry => ({
  id: `id-${headline}`,
  brandId: 'brand',
  templateType: 'masterclass',
  engine: 'gemini',
  model: 'gemini-2.5-flash',
  prompt: 'promo de prueba',
  subject: headline,
  content: {
    label: 'LABEL', headline, body: 'cuerpo del email', bulletsTitle: '', bullets: ['a'],
    ctaText: 'Reservar', ctaUrl: 'https://x.com', eventDate: '', eventTime: '', preCta: '', footerNote: '',
    emailBgColor: '#ffffff', bodyBgColor: '#ffffff', textureUrl: '', headerTextureUrl: '', layout: 'classic',
  },
  htmlSnapshot: '',
  rating,
  notes: '',
  createdAt: new Date().toISOString(),
} as unknown as EmailHistoryEntry);

describe('buildExamplesBlock', () => {
  it('devuelve vacío sin ejemplos', () => {
    expect(buildExamplesBlock([])).toBe('');
  });

  it('separa aprobados de rechazados', () => {
    const block = buildExamplesBlock([
      makeEntry('up', 'Titular bueno'),
      makeEntry('down', 'Titular malo'),
    ]);
    expect(block).toContain('aprobados');
    expect(block).toContain('Titular bueno');
    expect(block).toContain('RECHAZADOS');
    expect(block).toContain('Titular malo');
    // El rechazado va después del aprobado
    expect(block.indexOf('Titular bueno')).toBeLessThan(block.indexOf('Titular malo'));
  });

  it('solo aprobados no genera sección de rechazados', () => {
    const block = buildExamplesBlock([makeEntry('up', 'Solo bueno')]);
    expect(block).toContain('aprobados');
    expect(block).not.toContain('RECHAZADOS');
  });

  // Post-refactor D: el contenido vive en content.blocks[] y los campos legacy
  // quedan vacíos; los ejemplos few-shot deben leer el texto desde los bloques.
  it('extrae el texto de content.blocks[] cuando los campos legacy están vacíos', () => {
    const entry = {
      ...makeEntry('up', 'ignorado'),
      content: {
        label: '', headline: '', body: '', bulletsTitle: '', bullets: [],
        ctaText: '', ctaUrl: '', eventDate: '', eventTime: '', preCta: '', footerNote: '',
        emailBgColor: '#ffffff', bodyBgColor: '#ffffff', textureUrl: '', headerTextureUrl: '', layout: 'classic',
        blocks: [
          { id: 'h', type: 'header' },
          { id: 't', type: 'text', label: 'ETIQUETA-BLOQUE', headline: 'Titular desde bloque', body: 'Cuerpo desde bloque' },
          { id: 'c', type: 'cta', ctaText: 'CTA desde bloque', ctaUrl: 'https://x.com' },
          { id: 'f', type: 'footer' },
        ],
      },
    } as unknown as EmailHistoryEntry;
    const block = buildExamplesBlock([entry]);
    expect(block).toContain('Titular desde bloque');
    expect(block).toContain('Cuerpo desde bloque');
    expect(block).toContain('CTA desde bloque');
  });
});

describe('refineCommandPrompt', () => {
  it('soporta el comando rewrite', () => {
    expect(refineCommandPrompt('rewrite')).toContain('ángulo');
  });
});

describe('brand intelligence prompt context', () => {
  it('injects commercial memory as bounded non-executable data', () => {
    const brand = { name: 'Marca', intelligence: { summary: 'Resumen', industry: 'Salud', productsServices: ['Servicio'], audiences: ['Familias'], painPoints: ['Tiempo'], objections: [], differentiators: ['Rapidez'], benefits: ['Ahorro'], proofPoints: [], commonOffers: ['Consulta'], keywords: ['bienestar'], avoidWords: ['milagro'], complianceNotes: ['No prometer resultados'], sources: [], analyzedAt: new Date().toISOString(), warnings: [], websiteUrl: 'https://example.com' } } as unknown as Brand;
    const prompt = buildBrandIntelligenceBlock(brand);
    expect(prompt).toContain('Memoria verificada');
    expect(prompt).toContain('Servicio');
    expect(prompt).toContain('No prometer resultados');
  });
});
