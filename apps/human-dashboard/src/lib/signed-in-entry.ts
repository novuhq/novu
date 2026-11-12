import { INBOX_PATH } from '@/lib/inbox';

type CookieJar = {
  get(name: string): { value: string } | undefined;
};

/** The public pages a signed-in person leaves for the inbox: the homepage and the people page. */
export function isSignedInEntry(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  return path === '/' || path === '/sapien';
}

/**
 * Whether the request carries a Clerk session worth reading. `__client_uat` is `0` when signed out,
 * and `__session` holds the session token when signed in. With neither cookie the page renders
 * without Clerk, so the public pages stay up when the Clerk keys are absent.
 */
export function hasClerkSessionHint(cookies: CookieJar): boolean {
  if (cookies.get('__session')?.value) {
    return true;
  }

  const clientUat = cookies.get('__client_uat')?.value;

  return Boolean(clientUat && clientUat !== '0');
}

/** Ask Clerk about a public entry page only when a session cookie and the Clerk keys are both present. */
export function entryNeedsClerk(pathname: string, cookies: CookieJar, clerkConfigured: boolean): boolean {
  return isSignedInEntry(pathname) && clerkConfigured && hasClerkSessionHint(cookies);
}

/** Where a signed-in person on the homepage or the people page goes, or null when they stay. */
export function signedInEntryDestination(pathname: string, userId: string | null | undefined): string | null {
  if (!isSignedInEntry(pathname) || !userId) {
    return null;
  }

  return INBOX_PATH;
}
