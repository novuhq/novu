export type Region = 'us' | 'singapore';

// Type for organization public metadata
export interface OrganizationMetadata {
  region?: 'us-east-1' | 'ap-southeast-1';
  externalOrgId?: string;
  [key: string]: unknown;
}

export interface RegionContextType {
  selectedRegion: Region;
  setSelectedRegion: (region: Region) => void;
  getApiHostname: () => string;
}

// Map UI regions to organization metadata regions
export const REGION_METADATA_MAP = {
  us: 'us-east-1',
  singapore: 'ap-southeast-1',
} as const;

// Modal state types
export interface OrgCreationModalState {
  open: boolean;
  targetRegion: Region;
  previousRegion: Region;
}
