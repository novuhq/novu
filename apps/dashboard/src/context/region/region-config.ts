/**
 * Region Configuration
 *
 * This file defines the multi-region setup for the dashboard.
 * To add a new region:
 * 1. Add the environment variables in .env:
 *    - VITE_REGIONS (comma-separated list of region codes)
 *    - VITE_DASHBOARD_URL_<REGION_CODE>
 *    - VITE_API_HOSTNAME_<REGION_CODE>
 *    - VITE_WEBSOCKET_HOSTNAME_<REGION_CODE>
 * 2. The system will automatically detect and use the new region
 */

import { API_HOSTNAME, DASHBOARD_URL, getEnvVar, WEBSOCKET_HOSTNAME } from '@/config';

export interface RegionConfig {
  code: string;
  name: string;
  flag: string;
  dashboardUrl: string;
  apiHostname: string;
  websocketHostname: string;
  awsRegion: string; // e.g., 'us-east-1', 'ap-southeast-1'
}

/**
 * Parse regions from environment variables
 * Format: VITE_REGIONS=us,singapore,eu,india
 */
function parseRegionsFromEnv(): RegionConfig[] {
  // Get the list of region codes from VITE_REGIONS
  const regionsEnv = getEnvVar('VITE_REGIONS', 'us');
  const regionCodes = regionsEnv
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);

  // First region in the list is the base region
  const baseRegionCode = regionCodes[0] || 'us';

  const regions: RegionConfig[] = [];

  for (const code of regionCodes) {
    const upperCode = code.toUpperCase();
    const isBaseRegion = code === baseRegionCode;

    // Base region uses env vars without suffix, others use _SUFFIX
    const dashboardUrl = isBaseRegion ? DASHBOARD_URL : getEnvVar(`VITE_DASHBOARD_URL_${upperCode}`, '');

    const apiHostname = isBaseRegion ? API_HOSTNAME : getEnvVar(`VITE_API_HOSTNAME_${upperCode}`, '');

    const websocketHostname = isBaseRegion ? WEBSOCKET_HOSTNAME : getEnvVar(`VITE_WEBSOCKET_HOSTNAME_${upperCode}`, '');

    // AWS region mapping
    const baseAwsRegion = baseRegionCode === 'us' ? 'us-east-1' : '';
    const awsRegion = isBaseRegion
      ? getEnvVar('VITE_AWS_REGION', baseAwsRegion)
      : getEnvVar(`VITE_AWS_REGION_${upperCode}`, '');

    // Region display name and flag
    const defaultName = code.toUpperCase();
    const defaultFlag = isBaseRegion && code === 'us' ? '🇺🇸' : '🌍';
    const regionName = isBaseRegion
      ? getEnvVar('VITE_REGION_NAME', defaultName)
      : getEnvVar(`VITE_REGION_NAME_${upperCode}`, defaultName);
    const regionFlag = isBaseRegion
      ? getEnvVar('VITE_REGION_FLAG', defaultFlag)
      : getEnvVar(`VITE_REGION_FLAG_${upperCode}`, defaultFlag);

    // Skip if essential config is missing
    if (!dashboardUrl || !apiHostname || !websocketHostname) {
      if (!isBaseRegion) {
        console.warn(`Skipping region ${code}: missing required environment variables`);
        continue;
      }
    }

    regions.push({
      code: code.toLowerCase(),
      name: regionName,
      flag: regionFlag,
      dashboardUrl,
      apiHostname,
      websocketHostname,
      awsRegion,
    });
  }

  return regions;
}

/**
 * All configured regions
 */
export const REGIONS: RegionConfig[] = parseRegionsFromEnv();

/**
 * Map of region code to region config
 */
export const REGION_MAP = new Map<string, RegionConfig>(REGIONS.map((region) => [region.code, region]));

/**
 * Map of AWS region to region code
 * Used for detecting region from organization metadata
 */
export const AWS_REGION_TO_CODE_MAP = new Map<string, string>(REGIONS.map((region) => [region.awsRegion, region.code]));

/**
 * Default region (first region in the list)
 * This is determined dynamically from VITE_REGIONS environment variable
 */
export const DEFAULT_REGION = REGIONS[0]?.code || 'us';

/**
 * Validate that at least one region is configured
 */
if (REGIONS.length === 0) {
  console.error('No regions configured! Please set VITE_REGIONS environment variable.');
}

/**
 * Helper to get region config by code
 */
export function getRegionConfig(code: string): RegionConfig | undefined {
  return REGION_MAP.get(code.toLowerCase());
}

/**
 * Helper to get region code from AWS region
 */
export function getRegionCodeFromAws(awsRegion: string): string {
  return AWS_REGION_TO_CODE_MAP.get(awsRegion) || DEFAULT_REGION;
}
