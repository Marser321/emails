import { describe, expect, it } from 'vitest';
import { buildExamplesBlock, refineCommandPrompt } from './prompts';
import type { EmailHistoryEntry } from '@/lib/types';

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
});

describe('refineCommandPrompt', () => {
  it('soporta el comando rewrite', () => {
    expect(refineCommandPrompt('rewrite')).toContain('ángulo');
  });
});
