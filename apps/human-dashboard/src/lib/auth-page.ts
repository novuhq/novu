import { auth, currentUser, type User } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { REDIRECT_PARAM, SSO_ERROR_PARAM, safeRedirectPath } from '@/lib/auth-redirect';

type SearchParams = Record<string, string | string[] | undefined>;

/** The page to return to after sign-in or sign-up, read from the query of the page being rendered. */
export async function getRedirectPath(searchParams: SearchParams): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

  return safeRedirectPath(searchParams[REDIRECT_PARAM], host);
}

/**
 * What the sign-in and sign-up pages need before they render their form. A visitor who is signed in
 * already goes straight to where the form would have sent them.
 */
export async function prepareAuthForm(searchParams: SearchParams) {
  const redirectPath = await getRedirectPath(searchParams);

  // The session alone isn't enough: right after an account was deleted, its session token still reads
  // as signed in for up to a minute, and the dashboard would have nobody to show.
  const { userId } = await auth();
  if (userId && (await findCurrentUser())) {
    redirect(redirectPath);
  }

  return {
    redirectPath,
    initialError: searchParams[SSO_ERROR_PARAM]
      ? 'Could not finish with that provider. Try again, or use your email and password.'
      : undefined,
  };
}

/**
 * The signed-in user, or null when there is none. Also null when the session outlived its user: Clerk
 * answers "not found" for a user that was just deleted, while the session token is still valid.
 */
export async function findCurrentUser(): Promise<User | null> {
  try {
    return await currentUser();
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}
