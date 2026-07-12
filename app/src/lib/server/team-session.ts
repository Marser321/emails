import 'server-only';

import { cookies } from 'next/headers';
import { isValidTeamSessionCookie, TEAM_COOKIE_NAME } from './team-access';

export async function hasValidTeamSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidTeamSessionCookie(cookieStore.get(TEAM_COOKIE_NAME)?.value);
}
