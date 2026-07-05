import { SsrfBlockedError } from '../utils/ssrf-url-validation';

export const SINCH_SMS_REGIONS = ['eu', 'us', 'au', 'br', 'ca'] as const;

export type SinchSmsRegion = (typeof SINCH_SMS_REGIONS)[number];

const SINCH_SMS_REGION_SET = new Set<string>(SINCH_SMS_REGIONS);

export function assertAllowedSinchSmsRegion(region: string | undefined): SinchSmsRegion {
  const normalized = (region ?? 'eu').trim().toLowerCase();

  if (!normalized || !SINCH_SMS_REGION_SET.has(normalized)) {
    throw new SsrfBlockedError(
      'INVALID_URL',
      `Invalid Sinch region. Allowed regions: ${SINCH_SMS_REGIONS.join(', ')}.`
    );
  }

  return normalized as SinchSmsRegion;
}
