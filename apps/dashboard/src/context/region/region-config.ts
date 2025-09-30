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

  const regions: RegionConfig[] = [];

  for (const code of regionCodes) {
    const upperCode = code.toUpperCase();
    const isBaseRegion = code === 'us';

    // US (base region) uses env vars without suffix, all others use _SUFFIX
    // e.g., VITE_DASHBOARD_URL for US, VITE_DASHBOARD_URL_SG for Singapore
    const dashboardUrl = isBaseRegion ? DASHBOARD_URL : getEnvVar(`VITE_DASHBOARD_URL_${upperCode}`, '');

    const apiHostname = isBaseRegion ? API_HOSTNAME : getEnvVar(`VITE_API_HOSTNAME_${upperCode}`, '');

    const websocketHostname = isBaseRegion ? WEBSOCKET_HOSTNAME : getEnvVar(`VITE_WEBSOCKET_HOSTNAME_${upperCode}`, '');

    // AWS region mapping (can have suffix for all regions including US)
    const awsRegion = getEnvVar(`VITE_AWS_REGION_${upperCode}`, isBaseRegion ? 'us-east-1' : '');

    const regionName = getEnvVar(`VITE_REGION_NAME_${upperCode}`, code.toUpperCase());
    const regionFlag = getEnvVar(`VITE_REGION_FLAG_${upperCode}`, '🌍');

    // Debug logging
    console.log(`🔍 Parsing region: ${code}`, {
      dashboardUrl,
      apiHostname,
      websocketHostname,
      awsRegion,
      isBaseRegion,
    });

    // Skip if essential config is missing (except for US which has defaults)
    if (!dashboardUrl || !apiHostname || !websocketHostname) {
      if (code !== 'us') {
        console.warn(`❌ Skipping region ${code}: missing required environment variables`);
        console.warn('Missing values:', {
          dashboardUrl: dashboardUrl || 'MISSING',
          apiHostname: apiHostname || 'MISSING',
          websocketHostname: websocketHostname || 'MISSING',
        });
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
 * Default region (first region in the list, typically 'us')
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
