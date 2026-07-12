import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { TEAM_COOKIE_NAME } from '@/lib/server/team-access';
import { DELETE, POST } from './route';

const password = 'team-password-that-is-longer-than-16';

describe('team password exchange route', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('sets a secure derived cookie for the correct password', async () => {
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', password);
    const request = new NextRequest('https://example.com/api/auth/team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const response = await POST(request);
    const cookie = response.cookies.get(TEAM_COOKIE_NAME);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.value).not.toBe(password);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax');
  });

  it('rejects incorrect and malformed passwords without setting a cookie', async () => {
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', password);
    for (const body of [{ password: 'wrong' }, {}, { password, extra: true }]) {
      const request = new NextRequest('https://example.com/api/auth/team', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(response.cookies.get(TEAM_COOKIE_NAME)).toBeUndefined();
    }
  });

  it('fails closed when the team password is not configured', async () => {
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', '');
    const request = new NextRequest('https://example.com/api/auth/team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    expect((await POST(request)).status).toBe(503);
  });

  it('clears the team session on logout', async () => {
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(`${TEAM_COOKIE_NAME}=`);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
