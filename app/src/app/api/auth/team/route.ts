import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createTeamSessionValue,
  isTeamPasswordConfigured,
  isValidTeamPassword,
  TEAM_COOKIE_NAME,
} from '@/lib/server/team-access';

const requestSchema = z.object({ password: z.string().min(1).max(512) }).strict();

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: NextRequest) {
  if (!isTeamPasswordConfigured()) {
    return noStore(NextResponse.json({ error: 'El acceso del equipo no está configurado.' }, { status: 503 }));
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidTeamPassword(parsed.data.password)) {
    return noStore(NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 }));
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(TEAM_COOKIE_NAME, createTeamSessionValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    priority: 'high',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return noStore(response);
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(TEAM_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return noStore(response);
}
