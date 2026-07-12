import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmbedSessionValue, isEmbedAccessConfigured, isValidEmbedSessionCookie, isValidEmbedToken } from './embed-access';

afterEach(() => vi.unstubAllEnvs());

describe('secure iframe access', () => {
  it('requires a server token with enough entropy', () => {
    vi.stubEnv('EMAILBUILDER_EMBED_TOKEN', 'short');
    expect(isEmbedAccessConfigured()).toBe(false);
    expect(isValidEmbedToken('short')).toBe(false);
  });

  it('compares the configured token without accepting near matches', () => {
    const token = 'embed-secret-that-is-longer-than-32-characters';
    vi.stubEnv('EMAILBUILDER_EMBED_TOKEN', token);
    expect(isEmbedAccessConfigured()).toBe(true);
    expect(isValidEmbedToken(token)).toBe(true);
    expect(isValidEmbedToken(`${token}x`)).toBe(false);
    expect(isValidEmbedToken(null)).toBe(false);
    expect(createEmbedSessionValue()).not.toContain(token);
    expect(isValidEmbedSessionCookie(createEmbedSessionValue())).toBe(true);
    expect(isValidEmbedSessionCookie(token)).toBe(false);
  });
});
