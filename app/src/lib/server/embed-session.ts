import 'server-only';

import { cookies } from 'next/headers';
import { EMBED_COOKIE_NAME, isValidEmbedSessionCookie } from './embed-access';

export async function hasValidEmbedSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidEmbedSessionCookie(cookieStore.get(EMBED_COOKIE_NAME)?.value);
}
