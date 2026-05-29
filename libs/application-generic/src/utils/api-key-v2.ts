import { createHash, randomBytes } from 'crypto';

import { ApiKeyTierEnum } from '@novu/shared';

const API_KEY_V2_BRAND = 'nv';
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function getApiKeyV2RegionCode(): string {
  if (process.env.IS_SELF_HOSTED === 'true') {
    return process.env.NOVU_API_KEY_REGION_CODE || 'sh';
  }

  return process.env.NOVU_REGION_CODE || process.env.API_REGION_CODE || 'us';
}

export function isV2ApiKey(apiKey: string): boolean {
  return apiKey.startsWith(`${API_KEY_V2_BRAND}_`);
}

export function isLegacyApiKey(apiKey: string): boolean {
  return /^[a-f0-9]{32}$/i.test(apiKey);
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function parseApiKeyV2Prefix(apiKey: string): { tier: ApiKeyTierEnum; region: string } | null {
  if (!isV2ApiKey(apiKey)) {
    return null;
  }

  const parts = apiKey.split('_');

  if (parts.length < 4) {
    return null;
  }

  const tier = parts[1] as ApiKeyTierEnum;

  if (tier !== ApiKeyTierEnum.ENVIRONMENT && tier !== ApiKeyTierEnum.ORGANIZATION) {
    return null;
  }

  return {
    tier,
    region: parts[2],
  };
}

export function generateApiKeyV2(tier: ApiKeyTierEnum): { apiKey: string; hash: string; keyPrefix: string; last4: string } {
  const region = getApiKeyV2RegionCode();
  const randomPart = randomBytes(32).toString('base64url');
  const apiKey = `${API_KEY_V2_BRAND}_${tier}_${region}_${randomPart}`;
  const hash = hashApiKey(apiKey);
  const keyPrefix = `${API_KEY_V2_BRAND}_${tier}_${region}`;
  const last4 = apiKey.slice(-4);

  return {
    apiKey,
    hash,
    keyPrefix,
    last4,
  };
}

export function generateSigningSecretValue(): string {
  const region = getApiKeyV2RegionCode();
  const randomPart = randomBytes(32).toString('base64url');

  return `nvsign_${region}_${randomPart}`;
}
