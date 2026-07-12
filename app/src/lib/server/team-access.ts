import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const TEAM_COOKIE_NAME = 'emailbuilder_team';

function configuredPassword(): string {
  return process.env.EMAILBUILDER_TEAM_PASSWORD || '';
}

export function isTeamPasswordConfigured(): boolean {
  return configuredPassword().length >= 16;
}

export function isValidTeamPassword(candidate: string | null | undefined): boolean {
  const expected = configuredPassword();
  if (!candidate || expected.length < 16) return false;
  return safeEqual(candidate, expected);
}

export function createTeamSessionValue(): string {
  const expected = configuredPassword();
  if (expected.length < 16) return '';
  return createHmac('sha256', expected).update('emailbuilder-team-session-v1').digest('base64url');
}

export function isValidTeamSessionCookie(candidate: string | null | undefined): boolean {
  const expected = createTeamSessionValue();
  return Boolean(candidate && expected && safeEqual(candidate, expected));
}

function safeEqual(candidate: string, expected: string): boolean {
  const candidateHash = createHash('sha256').update(candidate).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}
