import { describe, expect, it } from 'vitest';
import { mapGeminiError } from './gemini';

describe('Gemini error mapping', () => {
  it('maps authentication, quota and timeout errors without leaking provider payloads', () => {
    expect(mapGeminiError({ status: 403, message: 'permission denied' }).message).toContain('inválida');
    expect(mapGeminiError({ status: 429, message: 'RESOURCE_EXHAUSTED' }).message).toContain('Límite gratuito');
    expect(mapGeminiError({ name: 'TimeoutError', message: 'timeout' }).message).toContain('tardó demasiado');
  });
});
