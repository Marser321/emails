import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createEmbedSessionValue } from '@/lib/server/embed-access';

const getUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { proxy } from './proxy';

describe('authentication proxy', () => {
  beforeEach(() => {
    vi.stubEnv('EMAILBUILDER_OPEN_ACCESS', 'false');
    vi.stubEnv('EMAILBUILDER_AUTH_BYPASS', 'false');
    vi.stubEnv('EMAILBUILDER_EMBED_TOKEN', 'embed-secret-that-is-longer-than-32-characters');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-test-key');
    getUser.mockReset().mockResolvedValue({ data: { user: null } });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('allows only the token exchange endpoint to bootstrap an iframe session', async () => {
    const response = await proxy(new NextRequest('https://example.com/api/embed/session', { method: 'POST' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rejects cross-origin writes made with an iframe session', async () => {
    const request = new NextRequest('https://example.com/api/settings', {
      method: 'PUT',
      headers: {
        cookie: `emailbuilder_embed=${createEmbedSessionValue()}`,
        origin: 'https://attacker.example',
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Origen no permitido.' });
  });

  it('allows private APIs with a valid iframe session cookie', async () => {
    const request = new NextRequest('https://example.com/api/settings', {
      headers: { cookie: `emailbuilder_embed=${createEmbedSessionValue()}` },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('returns JSON 401 for an anonymous private API request', async () => {
    const response = await proxy(new NextRequest('https://example.com/api/settings'));

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({ error: 'No autenticado.' });
  });

  it('redirects an anonymous page request to the private login', async () => {
    const response = await proxy(new NextRequest('https://example.com/editor'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/login?next=%2Feditor');
  });
});
