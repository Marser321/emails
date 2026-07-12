import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { proxy } from './proxy';

describe('authentication proxy', () => {
  beforeEach(() => {
    vi.stubEnv('EMAILBUILDER_OPEN_ACCESS', 'false');
    vi.stubEnv('EMAILBUILDER_AUTH_BYPASS', 'false');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-test-key');
    getUser.mockReset().mockResolvedValue({ data: { user: null } });
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
