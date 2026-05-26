import { OrganizationProductTypeEnum, tryReadOrganizationProductType } from '@novu/shared';

// Missing metadata counts as Platform so legacy tenants without a productType keep working.
export function isPlatformWorkspace(publicMetadata: Record<string, unknown> | undefined): boolean {
  const productType = tryReadOrganizationProductType(publicMetadata);

  return productType !== OrganizationProductTypeEnum.CONNECT;
}
