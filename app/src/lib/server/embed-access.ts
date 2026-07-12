import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const EMBED_COOKIE_NAME = 'emailbuilder_embed';

function configuredToken(): string {
  return process.env.EMAILBUILDER_EMBED_TOKEN?.trim() || '';
}

export function isEmbedAccessConfigured(): boolean {
  return configuredToken().length >= 32;
}

export function isValidEmbedToken(candidate: string | null | undefined): boolean {
  const expected = configuredToken();
  if (!candidate || expected.length < 32) return false;

  return safeEqual(candidate, expected);
}

export function createEmbedSessionValue(): string {
  const expected = configuredToken();
  if (expected.length < 32) return '';
  return createHmac('sha256', expected).update('emailbuilder-embed-session-v1').digest('base64url');
}

export function isValidEmbedSessionCookie(candidate: string | null | undefined): boolean {
  const expected = createEmbedSessionValue();
  return Boolean(candidate && expected && safeEqual(candidate, expected));
}

function safeEqual(candidate: string, expected: string): boolean {
  const candidateHash = createHash('sha256').update(candidate).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}
