import { DASHBOARD_HOME } from '@/components/dashboard/nav';

/** The query parameter that carries the page to return to. Clerk's route protection uses the same name. */
export const REDIRECT_PARAM = 'redirect_url';

/** Set on the way back to the form when signing in with GitHub or Google did not work out. */
export const SSO_ERROR_PARAM = 'sso_error';

export type AuthPage = '/sign-in' | '/sign-up';

/**
 * Where to go after signing in or up: the page that sent the visitor here, as a path on this site.
 * The value comes from the URL, so anything that points at another site (or back at the forms)
 * is replaced with the dashboard. Route protection sends a full URL, the pages send a path.
 */
export function safeRedirectPath(value: string | string[] | undefined | null, host: string | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !host) {
    return DASHBOARD_HOME;
  }

  let url: URL;
  try {
    // The scheme of the base does not matter: only the host is compared and only the path is kept.
    url = new URL(raw, `http://${host}`);
  } catch {
    return DASHBOARD_HOME;
  }

  const isThisSite = url.host === host && (url.protocol === 'http:' || url.protocol === 'https:');
  if (!isThisSite || isAuthPath(url.pathname)) {
    return DASHBOARD_HOME;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function isAuthPath(pathname: string): boolean {
  return ['/sign-in', '/sign-up'].some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

/** A link to one of the forms that keeps the page to return to. */
export function authHref(page: AuthPage, redirectPath: string): string {
  return withRedirect(page, redirectPath);
}

/** Where GitHub and Google send the visitor back to, on the same side (sign-in or sign-up) they started from. */
export function ssoCallbackHref(page: AuthPage, redirectPath: string): string {
  return withRedirect(`${page}/sso-callback`, redirectPath);
}

function withRedirect(path: string, redirectPath: string): string {
  if (redirectPath === DASHBOARD_HOME) {
    return path;
  }

  return `${path}?${new URLSearchParams({ [REDIRECT_PARAM]: redirectPath })}`;
}
