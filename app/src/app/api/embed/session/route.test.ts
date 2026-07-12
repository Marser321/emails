import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const token = 'embed-secret-that-is-longer-than-32-characters';

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/embed/session', () => {
  it('sets a derived third-party cookie for the configured token', async () => {
    vi.stubEnv('EMAILBUILDER_EMBED_TOKEN', token);
    const response = await POST(new NextRequest('https://example.com/api/embed/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }));

    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') || '';
    expect(cookie).toContain('emailbuilder_embed=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=none');
    expect(cookie).toContain('Partitioned');
    expect(cookie).not.toContain(token);
  });

  it('rejects an invalid token without creating a cookie', async () => {
    vi.stubEnv('EMAILBUILDER_EMBED_TOKEN', token);
    const response = await POST(new NextRequest('https://example.com/api/embed/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong-token-that-is-longer-than-32-characters' }),
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
