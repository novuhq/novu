import { getProviderOverrideConfig, PushProviderIdEnum, type TriggerOverrides } from '@novu/shared';
import { combineProviderOverrides } from './send-message.base';

export type PushProviderOverride = {
  providerId: PushProviderIdEnum;
  overrides: Record<string, unknown>;
};

export type PushRoutingCredentials = {
  deviceTokens?: string[];
  topic?: string;
};

/** FCM topic/condition sends are broadcast — they must not fan out per subscriber device token. */
export function isBroadcastRoutingOverride(overrides: Record<string, unknown> | null | undefined): boolean {
  if (!overrides) {
    return false;
  }

  return typeof overrides.topic === 'string' || typeof overrides.condition === 'string';
}

export function hasTokenlessRoutingOverride(
  providerId: PushProviderIdEnum,
  overrides: Record<string, unknown> | null | undefined
): boolean {
  if (!overrides) {
    return false;
  }

  if (providerId === PushProviderIdEnum.FCM) {
    if (
      typeof overrides.topic === 'string' ||
      typeof overrides.condition === 'string' ||
      typeof overrides.token === 'string' ||
      Array.isArray(overrides.tokens)
    ) {
      return true;
    }
  }

  const keys = getProviderOverrideConfig(providerId)?.exclusiveKeyGroups?.flat() ?? [];

  return keys.some((key) => key in overrides);
}

/**
 * Maps FCM routing overrides onto channel credentials used for token-less send selection.
 * Precedence matches the provider send plan: token > tokens > topic > condition.
 * `token` / `condition` only need an empty deviceTokens marker — the provider reads them from bridge data.
 */
export function extractFcmRoutingCredentials(overrides: Record<string, unknown>): PushRoutingCredentials | null {
  if (typeof overrides.token === 'string') {
    return { deviceTokens: [] };
  }

  if (Array.isArray(overrides.tokens)) {
    // Only plain strings — objects (e.g. Mongo operators) must never reach $pull token cleanup.
    const tokens = overrides.tokens.filter((token): token is string => typeof token === 'string');

    if (tokens.length > 0) {
      return { deviceTokens: tokens };
    }
  }

  if (typeof overrides.topic === 'string') {
    return { topic: overrides.topic };
  }

  if (typeof overrides.condition === 'string') {
    return { deviceTokens: [] };
  }

  return null;
}

export function extractPushRoutingCredentials(
  providerId: PushProviderIdEnum,
  overrides: Record<string, unknown> | null | undefined
): PushRoutingCredentials | null {
  if (!overrides) {
    return null;
  }

  switch (providerId) {
    case PushProviderIdEnum.FCM:
      return extractFcmRoutingCredentials(overrides);
    default:
      return null;
  }
}

/**
 * Upserts fully-merged overrides for push providers with exclusive routing key groups
 * so content-override routing keys participate in synthetic channel construction.
 */
export function upsertMergedRoutingOverrides(
  result: PushProviderOverride[],
  command: {
    bridgeData?: Record<string, unknown> | null;
    overrides?: TriggerOverrides;
    step?: { stepId?: string };
  },
  pushProviderIds: readonly PushProviderIdEnum[]
): void {
  for (const providerId of pushProviderIds) {
    const exclusiveKeyGroups = getProviderOverrideConfig(providerId)?.exclusiveKeyGroups;

    if (!exclusiveKeyGroups?.length) {
      continue;
    }

    const mergedOverrides = combineProviderOverrides(
      command.bridgeData,
      command.overrides,
      command.step?.stepId,
      providerId
    );

    if (!hasTokenlessRoutingOverride(providerId, mergedOverrides)) {
      continue;
    }

    const existingIndex = result.findIndex((item) => item.providerId === providerId);

    if (existingIndex >= 0) {
      result[existingIndex].overrides = mergedOverrides;
    } else {
      result.push({
        providerId,
        overrides: mergedOverrides,
      });
    }
  }
}
