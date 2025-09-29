import { API_HOSTNAME, API_HOSTNAME_SG, WEBSOCKET_HOSTNAME, WEBSOCKET_HOSTNAME_SG } from '@/config';
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

export function detectRegionFromOrganization(organization: any): Region {
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

export function findOrganizationForRegion(region: Region, userMemberships: any) {
  const expectedMetadataRegion = REGION_METADATA_MAP[region];

  console.log('Looking for organization with region:', expectedMetadataRegion);
  console.log(
    'Available organizations:',
    userMemberships.data?.map((m: any) => ({
      name: m.organization.name,
      metadata: m.organization.publicMetadata,
    }))
  );

  const found = userMemberships.data?.find((membership: any) => {
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
