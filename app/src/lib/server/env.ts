import 'server-only';

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

export function isAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.EMAILBUILDER_AUTH_BYPASS === 'true';
}

// Modo público: la app se sirve SIN login (para embeberla como iframe en GHL,
// workspace único compartido). A diferencia del bypass de dev, este SÍ aplica en
// producción. El servidor pasa a usar la service-role key como gatekeeper de
// confianza (ver createServerSupabase). Off por defecto: hay que setear la env var.
export function isOpenAccessEnabled(): boolean {
  return process.env.EMAILBUILDER_OPEN_ACCESS === 'true';
}

export function publicAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}
