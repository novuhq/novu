import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT } from '@/config';
import { buildAbsoluteConnectUrl, buildAbsolutePlatformUrl } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

function buildSignInUrlForHost(buildAbsolute: (path: string) => string): string {
  return buildAbsolute(ROUTES.SIGN_IN);
}

/** Clerk `redirectWithAuth` appends a JWT in the location hash before the session is active. */
export function isCrossOriginAuthHandshakePending(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = window.location.hash;

  return hash.length > 1 && hash.includes('||');
}

export function buildCrossSignOutUrl(redirectUrl: string): string {
  const params = new URLSearchParams({ redirect_url: redirectUrl });

  return `${ROUTES.CROSS_SIGN_OUT}?${params.toString()}`;
}

/**
 * After sign-out on this host, continue on the other product host to clear its Clerk session,
 * then land on sign-in for the product the user signed out from.
 */
export function buildAfterSignOutUrl(): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED) {
    return ROUTES.SIGN_IN;
  }

  const finalSignInUrl = IS_NOVU_CONNECT
    ? buildSignInUrlForHost(buildAbsoluteConnectUrl)
    : buildSignInUrlForHost(buildAbsolutePlatformUrl);

  const otherHostCrossSignOut = IS_NOVU_CONNECT
    ? buildAbsolutePlatformUrl(buildCrossSignOutUrl(finalSignInUrl))
    : buildAbsoluteConnectUrl(buildCrossSignOutUrl(finalSignInUrl));

  return otherHostCrossSignOut;
}
