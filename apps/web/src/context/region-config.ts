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

export const REGIONS: RegionConfig[] = parseRegionsFromEnv();

export const REGION_MAP = new Map<string, RegionConfig>(REGIONS.map((region) => [region.code, region]));

export const AWS_REGION_TO_CODE_MAP = new Map<string, string>(REGIONS.map((region) => [region.awsRegion, region.code]));

export const DEFAULT_REGION = REGIONS[0]?.code || 'us';

if (REGIONS.length === 0) {
  console.error('No regions configured! Please set REACT_APP_REGIONS environment variable.');
}

export function getRegionConfig(code: string): RegionConfig | undefined {
  return REGION_MAP.get(code.toLowerCase());
}

export function getRegionCodeFromAws(awsRegion: string): string {
  return AWS_REGION_TO_CODE_MAP.get(awsRegion) || DEFAULT_REGION;
}

