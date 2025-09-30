// Region type is now dynamic based on configured regions
export type Region = string;

// Type for organization public metadata
export interface OrganizationMetadata {
  region?: string; // AWS region like 'us-east-1', 'ap-southeast-1', 'eu-central-1', etc.
  externalOrgId?: string;
  [key: string]: unknown;
}

export interface RegionContextType {
  selectedRegion: Region;
  setSelectedRegion: (region: Region) => void;
  getApiHostname: () => string;
}

// Modal state types
export interface OrgCreationModalState {
  open: boolean;
  targetRegion: Region;
  previousRegion: Region;
}
