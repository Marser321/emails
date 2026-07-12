import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createClient: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));
vi.mock('server-only', () => ({}));

import { createEmbedSessionValue, EMBED_COOKIE_NAME } from '@/lib/server/embed-access';
import { createTeamSessionValue, TEAM_COOKIE_NAME } from '@/lib/server/team-access';
import { createServerSupabase } from './server';

describe('server Supabase client for GHL embeds', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
    vi.stubEnv('EMAILBUILDER_EMBED_TOKEN', 'embed-secret-that-is-longer-than-32-characters');
    vi.stubEnv('EMAILBUILDER_TEAM_PASSWORD', 'team-password-that-is-longer-than-16');
    vi.stubEnv('EMAILBUILDER_OPEN_ACCESS', 'false');
    vi.stubEnv('EMAILBUILDER_AUTH_BYPASS', 'false');
    mocks.createClient.mockReset();
    mocks.createServerClient.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it('uses the server-only service role after a valid embed exchange', async () => {
    const serviceClient = { kind: 'service' };
    mocks.cookies.mockResolvedValue({
      get: (name: string) => name === EMBED_COOKIE_NAME ? { value: createEmbedSessionValue() } : undefined,
      getAll: () => [],
      set: vi.fn(),
    });
    mocks.createClient.mockReturnValue(serviceClient);

    await expect(createServerSupabase()).resolves.toBe(serviceClient);
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('uses the server-only service role after a valid team password exchange', async () => {
    const serviceClient = { kind: 'service' };
    mocks.cookies.mockResolvedValue({
      get: (name: string) => name === TEAM_COOKIE_NAME ? { value: createTeamSessionValue() } : undefined,
      getAll: () => [],
      set: vi.fn(),
    });
    mocks.createClient.mockReturnValue(serviceClient);

    await expect(createServerSupabase()).resolves.toBe(serviceClient);
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
