import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT } from '@/config';
import { buildPrimarySignInUrl, CONNECT_PRODUCT_VALUE } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

// Connect signs out back to the primary's sign-in (Connect-branded) so re-auth lands on Platform.
export function buildAfterSignOutUrl(): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED) {
    return ROUTES.SIGN_IN;
  }

  if (IS_NOVU_CONNECT) {
    return buildPrimarySignInUrl({ product: CONNECT_PRODUCT_VALUE });
  }

  return ROUTES.SIGN_IN;
}
