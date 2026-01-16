import { DEFAULT_REGION, getRegionCodeFromAws, getRegionConfig, REGIONS } from './region-config';
import { type OrganizationMetadata, type Region } from './region-types';

type OrganizationLike = {
  publicMetadata: Record<string, unknown>;
};

type OrganizationMembershipLike = {
  organization: OrganizationLike;
};

export function getApiHostnameForRegion(region: Region): string {
  const config = getRegionConfig(region);
  if (config) {
    return config.apiHostname;
  }

  // Fallback to default region
  const defaultConfig = getRegionConfig(DEFAULT_REGION);
  return defaultConfig?.apiHostname || '';
}

export function getWebSocketHostnameForRegion(region: Region): string {
  const config = getRegionConfig(region);
  if (config) {
    return config.websocketHostname;
  }

  // Fallback to default region
  const defaultConfig = getRegionConfig(DEFAULT_REGION);
  return defaultConfig?.websocketHostname || '';
}

export function detectRegionFromOrganization(organization: OrganizationLike | null | undefined): Region {
  if (!organization) return DEFAULT_REGION;

  const orgMetadata = organization.publicMetadata as OrganizationMetadata;
  const awsRegion = orgMetadata?.region;

  // No region metadata means default region
  if (!awsRegion) {
    return DEFAULT_REGION;
  }

  // Map AWS region to region code
  const regionCode = getRegionCodeFromAws(awsRegion);
  return regionCode;
}

export function findOrganizationForRegion(region: Region, userMemberships: { data?: OrganizationMembershipLike[] }) {
  // Get the AWS region for the requested region code
  const regionConfig = getRegionConfig(region);
  if (!regionConfig) {
    return undefined;
  }

  const expectedAwsRegion = regionConfig.awsRegion;

  const found = userMemberships.data?.find((membership) => {
    const orgMetadata = membership.organization.publicMetadata as OrganizationMetadata;
    const awsRegion = orgMetadata?.region;

    // If no region metadata, assume default region
    if (!awsRegion) {
      const defaultConfig = getRegionConfig(DEFAULT_REGION);
      return expectedAwsRegion === defaultConfig?.awsRegion;
    }

    return awsRegion === expectedAwsRegion;
  });

  return found;
}

export function isInOnboardingFlow(): boolean {
  return (
    window.location.pathname.includes('/onboarding') ||
    window.location.pathname.includes('/inbox-usecase') ||
    window.location.pathname.includes('/inbox-embed') ||
    window.location.pathname.includes('/auth/organization-list')
  );
}

export function detectRegionFromURL(): Region {
  const currentOrigin = window.location.origin;
  const normalizeUrl = (url: string) => url?.replace(/\/$/, '');
  const currentNormalized = normalizeUrl(currentOrigin);

  // Try to match current URL with any configured region's dashboard URL
  for (const region of REGIONS) {
    const regionDashboardUrl = normalizeUrl(region.dashboardUrl);
    if (currentNormalized === regionDashboardUrl) {
      return region.code;
    }
  }

  // Fallback: detect based on domain patterns
  const lowerOrigin = currentOrigin.toLowerCase();
  for (const region of REGIONS) {
    if (
      lowerOrigin.includes(`${region.code}.`) ||
      lowerOrigin.includes(`.${region.code}.`) ||
      lowerOrigin.includes(`-${region.code}.`)
    ) {
      return region.code;
    }
  }

  // Default to base region
  return DEFAULT_REGION;
}

export function getDashboardUrlForRegion(region: Region): string {
  const config = getRegionConfig(region);
  if (config) {
    return config.dashboardUrl;
  }

  // Fallback to default region or current origin
  const defaultConfig = getRegionConfig(DEFAULT_REGION);
  return defaultConfig?.dashboardUrl || window.location.origin;
}
