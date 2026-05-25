import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT } from '@/config';
import { buildPrimarySignInUrl, CONNECT_PRODUCT_VALUE } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

/**
 * Destination after `clerk.signOut()`. With satellite domains the Clerk session is shared across
 * primary and satellite, so signing out on either host clears the global session — there's no
 * need to chain through a `/auth/cross-sign-out` page on the other host.
 *
 *  - On the Platform primary: land on local /auth/sign-in.
 *  - On the Connect satellite: land on the primary's /auth/sign-in?product=connect so the
 *    visitor sees Connect-branded sign-in and returns to connect.novu.co after signing in.
 *  - When the split is not configured: just /auth/sign-in (same origin).
 */
export function buildAfterSignOutUrl(): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED) {
    return ROUTES.SIGN_IN;
  }

  if (IS_NOVU_CONNECT) {
    return buildPrimarySignInUrl({ product: CONNECT_PRODUCT_VALUE });
  }

  return ROUTES.SIGN_IN;
}
