import { API_ROOT, WS_URL } from '../config';

export interface RegionConfig {
  code: string;
  name: string;
  apiHostname: string;
  websocketHostname: string;
  awsRegion: string;
}

function getEnvVar(key: string, fallback: string = ''): string {
  return window._env_?.[key] || (process.env as Record<string, string | undefined>)[key] || fallback;
}

function parseRegionsFromEnv(): RegionConfig[] {
  const regionsEnv = getEnvVar('REACT_APP_REGIONS', 'us');
  const regionCodes = regionsEnv
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);

  const baseRegionCode = regionCodes[0] || 'us';

  const regions: RegionConfig[] = [];

  for (const code of regionCodes) {
    const upperCode = code.toUpperCase();
    const isBaseRegion = code === baseRegionCode;

    const apiHostname = isBaseRegion ? API_ROOT : getEnvVar(`REACT_APP_API_URL_${upperCode}`, '');

    const websocketHostname = isBaseRegion ? WS_URL : getEnvVar(`REACT_APP_WS_URL_${upperCode}`, '');

    const baseAwsRegion = baseRegionCode === 'us' ? 'us-east-1' : '';
    const awsRegion = isBaseRegion
      ? getEnvVar('REACT_APP_AWS_REGION', baseAwsRegion)
      : getEnvVar(`REACT_APP_AWS_REGION_${upperCode}`, '');

    const defaultName = code.toUpperCase();
    const regionName = isBaseRegion
      ? getEnvVar('REACT_APP_REGION_NAME', defaultName)
      : getEnvVar(`REACT_APP_REGION_NAME_${upperCode}`, defaultName);

    if (!apiHostname || !websocketHostname) {
      if (!isBaseRegion) {
        console.warn(`Skipping region ${code}: missing required environment variables`);
        continue;
      }
    }

    regions.push({
      code: code.toLowerCase(),
      name: regionName,
      apiHostname,
      websocketHostname,
      awsRegion,
    });
  }

  return regions;
}

let cachedRegions: RegionConfig[] | null = null;
let cachedRegionMap: Map<string, RegionConfig> | null = null;
let cachedAwsRegionMap: Map<string, string> | null = null;
let cachedDefaultRegion: string | null = null;

function initializeRegions() {
  if (cachedRegions !== null) {
    return;
  }

  cachedRegions = parseRegionsFromEnv();
  cachedRegionMap = new Map<string, RegionConfig>(cachedRegions.map((region) => [region.code, region]));
  cachedAwsRegionMap = new Map<string, string>(cachedRegions.map((region) => [region.awsRegion, region.code]));
  cachedDefaultRegion = cachedRegions[0]?.code || 'us';

  if (cachedRegions.length === 0) {
    console.error('No regions configured! Please set REACT_APP_REGIONS environment variable.');
  }
}

export function getRegions(): RegionConfig[] {
  initializeRegions();
  return cachedRegions!;
}

export function getDefaultRegion(): string {
  initializeRegions();
  return cachedDefaultRegion!;
}

export function getRegionConfig(code: string): RegionConfig | undefined {
  initializeRegions();
  return cachedRegionMap!.get(code.toLowerCase());
}

export function getRegionCodeFromAws(awsRegion: string): string {
  initializeRegions();
  return cachedAwsRegionMap!.get(awsRegion) || getDefaultRegion();
}

