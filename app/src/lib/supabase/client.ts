'use client';

import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase no está configurado. Revisa las variables NEXT_PUBLIC_SUPABASE_*');
  }

  browserClient ??= createBrowserClient(url, key, { auth: { flowType: 'pkce' } });
  return browserClient;
}
