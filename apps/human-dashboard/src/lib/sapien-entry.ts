import { INBOX_PATH } from '@/lib/inbox';

type CookieJar = {
  get(name: string): { value: string } | undefined;
};

/** The people page. A trailing slash is the same page. */
export function isSapienPage(pathname: string): boolean {
  return pathname === '/sapien' || pathname === '/sapien/';
}

/**
 * Whether the request carries a Clerk session worth reading. `__client_uat` is `0` when signed out,
 * and `__session` holds the session token when signed in. With neither cookie the page renders
 * without Clerk, so the public page stays up when the Clerk keys are absent.
 */
export function hasClerkSessionHint(cookies: CookieJar): boolean {
  if (cookies.get('__session')?.value) {
    return true;
  }

  const clientUat = cookies.get('__client_uat')?.value;

  return Boolean(clientUat && clientUat !== '0');
}

/** Ask Clerk about this people-page request only when a session cookie and the Clerk keys are both present. */
export function sapienNeedsClerk(pathname: string, cookies: CookieJar, clerkConfigured: boolean): boolean {
  return isSapienPage(pathname) && clerkConfigured && hasClerkSessionHint(cookies);
}

/** Where a signed-in person on the people page goes, or null when they stay on the page. */
export function sapienSignedInDestination(pathname: string, userId: string | null | undefined): string | null {
  if (!isSapienPage(pathname) || !userId) {
    return null;
  }

  return INBOX_PATH;
}
