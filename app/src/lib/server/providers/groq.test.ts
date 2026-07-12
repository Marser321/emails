import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Brand } from '@/lib/types';
import { GroqProvider } from './groq';

const brand: Brand = {
  id: 'brand', name: 'Marca', category: 'General', isFavorite: false,
  colors: { primary: '#0b2a4a', accent: '#29abe2', gradientStart: '#29abe2', gradientEnd: '#1b6fc4' },
  fonts: { heading: 'Arial', body: 'Verdana' }, logo: { type: 'text', value: 'MARCA' },
  footer: { tagline: '', subtitle: '', disclaimer: '' }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const generated = {
  label: 'Novedad', headline: 'Una propuesta clara', body: 'Contenido', bulletsTitle: 'Incluye', bullets: ['Uno'],
  ctaText: 'Ver más', ctaUrl: 'https://example.com', eventDate: '', eventTime: '', preCta: 'Conoce los detalles',
  footerNote: 'Información', emailBgColor: '#eef2f6', bodyBgColor: '#ffffff',
};

afterEach(() => vi.unstubAllGlobals());

describe('GroqProvider', () => {
  it('uses server authorization and structured output without exposing the key in the payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(generated) } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GroqProvider('secret-key', 'llama-test');
    await expect(provider.generate({ prompt: 'Crea un email', templateType: 'newsletter', brand, examples: [] })).resolves.toEqual(generated);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer secret-key');
    expect(init.body).not.toContain('secret-key');
    const requestBody = JSON.parse(init.body);
    expect(requestBody.response_format).toEqual({ type: 'json_object' });
    expect(requestBody.response_format).not.toHaveProperty('json_schema');
    expect(requestBody.messages[0].content).toContain('additionalProperties');
  });

  it('retries once when the model returns valid JSON that fails the shared schema', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ headline: 'Incompleto' }) } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(generated) } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GroqProvider('secret-key', 'llama-test');

    await expect(provider.generate({ prompt: 'Crea un email', templateType: 'newsletter', brand, examples: [] })).resolves.toEqual(generated);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retryBody.messages[1].content).toContain('no cumplió el contrato');
  });

  it('maps rate limits to a useful message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'rate limit' } }), { status: 429 })));
    const provider = new GroqProvider('secret-key');
    await expect(provider.generate({ prompt: 'Crea un email', templateType: 'newsletter', brand, examples: [] })).rejects.toThrow('Límite gratuito de Groq');
  });

  it('maps request timeouts', async () => {
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));
    const provider = new GroqProvider('secret-key');
    await expect(provider.refine({ text: 'Texto', field: 'body', command: 'shorten', brand })).rejects.toThrow('tardó demasiado');
  });
});
