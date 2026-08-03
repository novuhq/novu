import { readClerkRedirectUrlParam } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

/**
 * Flows that bounce through sign-in — CLI authorization, connect claim, deep links — carry their
 * return destination as `redirect_url`. Every hop between the auth screens has to forward it, or the
 * user ends up on the organization list instead of where they started.
 */
export function withRedirectUrl(path: string, redirectUrl: string | null): string {
  if (!redirectUrl) {
    return path;
  }

  return `${path}?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

export function buildSsoSignInPath(searchParams?: URLSearchParams): string {
  return withRedirectUrl(ROUTES.SSO_SIGN_IN, readClerkRedirectUrlParam(searchParams));
}
