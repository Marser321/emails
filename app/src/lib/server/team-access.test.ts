import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTeamSessionValue,
  isTeamPasswordConfigured,
  isValidTeamPassword,
  isValidTeamSessionCookie,
} from './team-access';

describe('team password access', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('requires a sufficiently long server password', () => {
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', 'too-short');

    expect(isTeamPasswordConfigured()).toBe(false);
    expect(isValidTeamPassword('too-short')).toBe(false);
    expect(createTeamSessionValue()).toBe('');
  });

  it('validates the password and a derived session without exposing the password', () => {
    const password = 'a-strong-team-password-with-32-chars';
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', password);

    const session = createTeamSessionValue();
    expect(isTeamPasswordConfigured()).toBe(true);
    expect(isValidTeamPassword(password)).toBe(true);
    expect(isValidTeamPassword('wrong-password-that-is-long-enough')).toBe(false);
    expect(session).not.toBe(password);
    expect(session).not.toContain(password);
    expect(isValidTeamSessionCookie(session)).toBe(true);
    expect(isValidTeamSessionCookie('invalid-session')).toBe(false);
  });

  it('invalidates existing sessions when the shared password changes', () => {
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', 'first-strong-team-password');
    const oldSession = createTeamSessionValue();
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', 'second-strong-team-password');

    expect(isValidTeamSessionCookie(oldSession)).toBe(false);
  });
});
