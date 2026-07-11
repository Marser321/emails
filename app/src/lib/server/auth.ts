import 'server-only';

import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isAuthBypassEnabled, isOpenAccessEnabled, isSupabaseConfigured } from '@/lib/server/env';
import { createServerSupabase } from '@/lib/supabase/server';

// Devuelve el id solo si es un UUID válido; si no (usuario de sistema en modo
// abierto/bypass), null — así created_by no rompe la FK a auth.users.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function toUuidOrNull(id: string | undefined | null): string | null {
  return id && UUID_RE.test(id) ? id : null;
}

export class AuthenticationError extends Error {
  constructor(message = 'Autenticación requerida') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function authenticationErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AuthenticationError)) return null;
  return NextResponse.json({ error: error.message }, { status: 401 });
}

const LOCAL_USER = {
  id: 'local-development-user',
  email: 'local@admediasolution.test',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date(0).toISOString(),
} as User;

// Usuario de sistema para el modo público (sin login). Su id no es un UUID a
// propósito: toUuidOrNull lo convierte en null al escribir created_by.
const OPEN_ACCESS_USER = { ...LOCAL_USER, id: 'open-access', email: 'workspace@admediasolution.com' } as User;

export async function requireUser(): Promise<User> {
  if (isOpenAccessEnabled()) return OPEN_ACCESS_USER;
  if (isAuthBypassEnabled()) return LOCAL_USER;
  if (!isSupabaseConfigured()) throw new AuthenticationError('Supabase no está configurado');

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new AuthenticationError();
  return data.user;
}

export async function withApiAuth<T extends unknown[]>(
  handler: (user: User, ...args: T) => Promise<Response>,
  ...args: T
): Promise<Response> {
  try {
    const user = await requireUser();
    return await handler(user, ...args);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
