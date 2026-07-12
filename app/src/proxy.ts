import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  EMBED_COOKIE_NAME,
  isValidEmbedSessionCookie,
} from '@/lib/server/embed-access';

const PUBLIC_PATHS = ['/login', '/auth/confirm', '/embed'];

export async function proxy(request: NextRequest) {
  const isLegacyPublicAsset = request.method === 'GET' && /^\/api\/assets\/[^/]+\/[^/]+$/.test(request.nextUrl.pathname);
  if (isLegacyPublicAsset) return NextResponse.next();
  const isEmbedBootstrap = request.method === 'POST' && request.nextUrl.pathname === '/api/embed/session';
  if (isEmbedBootstrap) return NextResponse.next();
  const isApi = request.nextUrl.pathname.startsWith('/api/');
  // Modo público (iframe GHL) o bypass de dev: sin verificación de sesión.
  const openAccess = process.env.EMAILBUILDER_OPEN_ACCESS === 'true';
  const bypass = process.env.NODE_ENV !== 'production' && process.env.EMAILBUILDER_AUTH_BYPASS === 'true';
  if (openAccess || bypass) return NextResponse.next();

  const hasEmbedSession = isValidEmbedSessionCookie(request.cookies.get(EMBED_COOKIE_NAME)?.value);
  if (hasEmbedSession) {
    const isUnsafeApiMethod = isApi && !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (isUnsafeApiMethod && request.headers.get('origin') !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
    }
    if (request.nextUrl.pathname === '/login') return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isPublic = PUBLIC_PATHS.some(path => request.nextUrl.pathname.startsWith(path));

  if (!url || !key) {
    if (request.nextUrl.pathname === '/login') return NextResponse.next();
    if (isApi) {
      return NextResponse.json({ error: 'La autenticación no está configurada.' }, { status: 503 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('configuration', 'missing');
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user && !isPublic) {
    if (isApi) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (data.user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|email-assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
