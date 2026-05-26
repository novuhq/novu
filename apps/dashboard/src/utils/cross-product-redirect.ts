import { OrganizationProductTypeEnum } from '@novu/shared';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { buildAbsoluteConnectUrl, buildAbsolutePlatformUrl } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

export type PickerProduct = 'platform' | 'connect';

export function toPickerProduct(productType: OrganizationProductTypeEnum): PickerProduct {
  return productType === OrganizationProductTypeEnum.CONNECT ? 'connect' : 'platform';
}

/**
 * Returns the absolute org-list URL on the OTHER product host when a hostname split is
 * configured. Used by the picker / auto-create flows when the user lands on the wrong product
 * (e.g. accepts an email invite that routed them through Platform's Clerk primary, but the
 * org's `productType` is `connect`). Returning `null` lets callers fall back to the in-app
 * create flow on single-host (self-hosted/dev) deployments.
 */
export function buildOtherProductOrgListUrl(currentProduct: PickerProduct): string | null {
  if (!IS_HOSTNAME_SPLIT_ENABLED) {
    return null;
  }

  return currentProduct === 'connect'
    ? buildAbsolutePlatformUrl(ROUTES.SIGNUP_ORGANIZATION_LIST)
    : buildAbsoluteConnectUrl(ROUTES.SIGNUP_ORGANIZATION_LIST);
}
