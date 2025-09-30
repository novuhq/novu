import {
  API_HOSTNAME,
  API_HOSTNAME_SG,
  DASHBOARD_URL,
  DASHBOARD_URL_SG,
  WEBSOCKET_HOSTNAME,
  WEBSOCKET_HOSTNAME_SG,
} from '@/config';
import { type OrganizationMembershipResource, type OrganizationResource } from '@clerk/types';
import { type OrganizationMetadata, REGION_METADATA_MAP, type Region } from './region-types';

export function getApiHostnameForRegion(region: Region): string {
  switch (region) {
    case 'singapore':
      return API_HOSTNAME_SG || API_HOSTNAME;
    case 'us':
    default:
      return API_HOSTNAME;
  }
}

export function getWebSocketHostnameForRegion(region: Region): string {
  switch (region) {
    case 'singapore':
      return WEBSOCKET_HOSTNAME_SG || WEBSOCKET_HOSTNAME;
    case 'us':
    default:
      return WEBSOCKET_HOSTNAME;
  }
}

export function detectRegionFromOrganization(organization: OrganizationResource | null | undefined): Region {
  if (!organization) return 'us';

  const orgMetadata = organization.publicMetadata as OrganizationMetadata;
  const orgRegion = orgMetadata?.region;

  console.log('Detecting region from current org:', organization.name, 'metadata:', orgMetadata);

  // No region metadata means US (default behavior)
  if (!orgRegion) {
    console.log('No region metadata found, defaulting to US');
    return 'us';
  }

  // Explicit region mapping
  if (orgRegion === 'us-east-1') {
    return 'us';
  }

  if (orgRegion === 'ap-southeast-1') {
    return 'singapore';
  }

  // Fallback to US for any unknown region
  console.log('Unknown region metadata:', orgRegion, 'defaulting to US');
  return 'us';
}

export function findOrganizationForRegion(
  region: Region,
  userMemberships: { data?: OrganizationMembershipResource[] }
) {
  const expectedMetadataRegion = REGION_METADATA_MAP[region];

  console.log('Looking for organization with region:', expectedMetadataRegion);
  console.log(
    'Available organizations:',
    userMemberships.data?.map((m) => ({
      name: m.organization.name,
      metadata: m.organization.publicMetadata,
    }))
  );

  const found = userMemberships.data?.find((membership) => {
    const orgMetadata = membership.organization.publicMetadata as OrganizationMetadata;
    const orgRegion = orgMetadata?.region;

    // If no region metadata, assume us-east-1
    if (!orgRegion) {
      return expectedMetadataRegion === 'us-east-1';
    }

    return orgRegion === expectedMetadataRegion;
  });

  console.log('Found organization for region:', found?.organization.name);
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

/**
 * Detects the current region based on the dashboard URL
 * This replaces the localStorage-based approach with a more reliable URL-based detection
 */
export function detectRegionFromURL(): Region {
  const currentOrigin = window.location.origin;

  console.log('Detecting region from URL:', currentOrigin);
  console.log('DASHBOARD_URL:', DASHBOARD_URL);
  console.log('DASHBOARD_URL_SG:', DASHBOARD_URL_SG);

  // If we have specific dashboard URLs configured, use them for detection
  if (DASHBOARD_URL_SG && DASHBOARD_URL) {
    // Normalize URLs for comparison (remove trailing slashes)
    const normalizeUrl = (url: string) => url.replace(/\/$/, '');
    const currentNormalized = normalizeUrl(currentOrigin);
    const sgNormalized = normalizeUrl(DASHBOARD_URL_SG);
    const usNormalized = normalizeUrl(DASHBOARD_URL);

    if (currentNormalized === sgNormalized) {
      console.log('Detected Singapore region from URL match');
      return 'singapore';
    }

    if (currentNormalized === usNormalized) {
      console.log('Detected US region from URL match');
      return 'us';
    }
  }

  // Fallback: detect based on domain patterns
  if (currentOrigin.includes('sg.') || currentOrigin.includes('singapore.') || currentOrigin.includes('asia.')) {
    console.log('Detected Singapore region from domain pattern');
    return 'singapore';
  }

  // Default to US region
  console.log('Defaulting to US region');
  return 'us';
}

/**
 * Gets the dashboard URL for a specific region
 */
export function getDashboardUrlForRegion(region: Region): string {
  switch (region) {
    case 'singapore':
      return DASHBOARD_URL_SG || DASHBOARD_URL || window.location.origin;
    case 'us':
    default:
      return DASHBOARD_URL || window.location.origin;
  }
}
