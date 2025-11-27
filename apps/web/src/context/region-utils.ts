import type { OrganizationResource } from '@clerk/types';
import { DEFAULT_REGION, getRegionCodeFromAws, getRegionConfig } from './region-config';

export type Region = string;

export interface OrganizationMetadata {
  region?: string;
  externalOrgId?: string;
  [key: string]: unknown;
}

export function getApiHostnameForRegion(region: Region): string {
  const config = getRegionConfig(region);
  if (config) {
    return config.apiHostname;
  }

  const defaultConfig = getRegionConfig(DEFAULT_REGION);
  return defaultConfig?.apiHostname || '';
}

export function getWebSocketHostnameForRegion(region: Region): string {
  const config = getRegionConfig(region);
  if (config) {
    return config.websocketHostname;
  }

  const defaultConfig = getRegionConfig(DEFAULT_REGION);
  return defaultConfig?.websocketHostname || '';
}

export function detectRegionFromOrganization(organization: OrganizationResource | null | undefined): Region {
  if (!organization) {
    return DEFAULT_REGION;
  }

  const orgMetadata = organization.publicMetadata as OrganizationMetadata;
  const awsRegion = orgMetadata?.region;

  if (!awsRegion) {
    return DEFAULT_REGION;
  }

  const regionCode = getRegionCodeFromAws(awsRegion);
  return regionCode;
}

