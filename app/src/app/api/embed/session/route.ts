import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createEmbedSessionValue, EMBED_COOKIE_NAME, isValidEmbedToken } from '@/lib/server/embed-access';

const requestSchema = z.object({ token: z.string().min(32).max(512) }).strict();

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidEmbedToken(parsed.data.token)) {
    return NextResponse.json({ error: 'Enlace de GHL inválido o vencido.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(EMBED_COOKIE_NAME, createEmbedSessionValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    priority: 'high',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
