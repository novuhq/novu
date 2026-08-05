import { readClerkAuthParamFromLocation, readClerkRedirectUrlParam } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

/**
 * Flows that bounce through the auth screens carry a return destination: most use `redirect_url`,
 * while the invitation flow uses `redirect`. Every hop has to forward it, or the user ends up on the
 * organization list — which, unlike the rest of the app, has no fallback that resumes the flow.
 */
export function readReturnDestination(searchParams?: URLSearchParams): string | null {
  return readClerkRedirectUrlParam(searchParams) ?? readClerkAuthParamFromLocation('redirect', searchParams);
}

export function withRedirectUrl(path: string, redirectUrl: string | null): string {
  if (!redirectUrl) {
    return path;
  }

  return `${path}?redirect_url=${encodeURIComponent(redirectUrl)}`;
}

export function buildSsoSignInPath(searchParams?: URLSearchParams): string {
  return withRedirectUrl(ROUTES.SSO_SIGN_IN, readReturnDestination(searchParams));
}
