export const TWILIO_SMS_REGIONS = ['us', 'eu'] as const;

export type TwilioSmsRegion = (typeof TWILIO_SMS_REGIONS)[number];

const TWILIO_SMS_REGION_SET = new Set<string>(TWILIO_SMS_REGIONS);

export type TwilioSmsClientRegionConfig = {
  edge: string;
  region: string;
};

const TWILIO_SMS_CLIENT_REGION_CONFIG: Record<Exclude<TwilioSmsRegion, 'us'>, TwilioSmsClientRegionConfig> = {
  eu: {
    edge: 'dublin',
    region: 'ie1',
  },
};

export function assertAllowedTwilioSmsRegion(region: string | undefined): TwilioSmsRegion {
  const normalized = (region ?? 'us').trim().toLowerCase();

  if (!normalized || !TWILIO_SMS_REGION_SET.has(normalized)) {
    throw new Error(`Invalid Twilio SMS region. Allowed regions: ${TWILIO_SMS_REGIONS.join(', ')}.`);
  }

  return normalized as TwilioSmsRegion;
}

export function getTwilioSmsClientRegionConfig(region: string | undefined): TwilioSmsClientRegionConfig | undefined {
  const normalizedRegion = assertAllowedTwilioSmsRegion(region);

  if (normalizedRegion === 'us') {
    return undefined;
  }

  return TWILIO_SMS_CLIENT_REGION_CONFIG[normalizedRegion];
}
