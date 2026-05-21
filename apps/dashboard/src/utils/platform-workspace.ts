import { OrganizationProductTypeEnum, tryReadOrganizationProductType } from '@novu/shared';

/**
 * Whether a membership or active org belongs on the Platform host. Explicit Connect orgs are
 * excluded; missing metadata is treated as Platform for legacy tenants.
 */
export function isPlatformWorkspace(publicMetadata: Record<string, unknown> | undefined): boolean {
  const productType = tryReadOrganizationProductType(publicMetadata);

  return productType !== OrganizationProductTypeEnum.CONNECT;
}
