import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig, isAuthBypassEnabled, isOpenAccessEnabled } from '@/lib/server/env';
import { hasValidEmbedSession } from '@/lib/server/embed-session';
import { hasValidTeamSession } from '@/lib/server/team-session';

export async function createServerSupabase() {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error('Supabase no está configurado');

  // Modo público (iframe GHL, sin login): el servidor es el gatekeeper de
  // confianza y usa la service-role key, que saltea RLS. Esta key vive SOLO en
  // el servidor (nunca NEXT_PUBLIC_), así que el navegador jamás la ve.
  // El bypass de dev también la necesita: sin sesión el cliente por cookies
  // queda como rol `anon`, que no tiene GRANT sobre las tablas — el login se
  // saltea pero todas las lecturas fallan con "permission denied".
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const embedAccess = await hasValidEmbedSession();
  const teamAccess = await hasValidTeamSession();
  if ((isOpenAccessEnabled() || embedAccess || teamAccess) && !serviceKey) {
    throw new Error('El acceso sin login está activo pero falta SUPABASE_SERVICE_ROLE_KEY');
  }
  if ((isOpenAccessEnabled() || isAuthBypassEnabled() || embedAccess || teamAccess) && serviceKey) {
    return createClient(config.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. src/proxy.ts performs refreshes.
        }
      },
    },
  });
}
