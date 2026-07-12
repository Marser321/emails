import { describe, expect, it } from 'vitest';
import { InvalidAIResponseError, parseAbTestResult, parseGeneratedContent } from './provider-output';

const validGenerated = {
  label: 'Masterclass gratuita', headline: 'Recupera el control de tu crédito', body: 'Texto principal',
  bulletsTitle: 'Aprenderás', bullets: ['Uno', 'Dos'], ctaText: 'Reservar', ctaUrl: 'https://example.com',
  eventDate: '18 de julio', eventTime: '11:00 AM', preCta: 'Te esperamos', footerNote: 'Cupos limitados',
  emailBgColor: '#eef2f6', bodyBgColor: '#ffffff',
};

describe('provider output validation', () => {
  it('accepts the shared structured email contract', () => {
    expect(parseGeneratedContent(JSON.stringify(validGenerated))).toEqual(validGenerated);
  });

  it('rejects malformed JSON and incomplete content', () => {
    expect(() => parseGeneratedContent('not-json')).toThrow(InvalidAIResponseError);
    expect(() => parseGeneratedContent(JSON.stringify({ headline: 'Falta el resto' }))).toThrow(InvalidAIResponseError);
  });

  it('validates A/B subjects and preheaders', () => {
    const result = { subjects: [{ type: 'curiosidad', text: '¿Listo para empezar?' }], preheaders: ['Tu acceso está disponible'] };
    expect(parseAbTestResult(JSON.stringify(result))).toEqual(result);
    expect(() => parseAbTestResult(JSON.stringify({ subjects: [], preheaders: [] }))).toThrow(InvalidAIResponseError);
  });
});
