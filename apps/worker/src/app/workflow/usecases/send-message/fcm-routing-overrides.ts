import { FCM_ROUTING_KEYS, getProviderOverrideConfig, PushProviderIdEnum, type TriggerOverrides } from '@novu/shared';
import { combineProviderOverrides } from './send-message.base';

export type PushProviderOverride = {
  providerId: PushProviderIdEnum;
  overrides: Record<string, unknown>;
};

export type PushRoutingCredentials = {
  deviceTokens?: string[];
  topic?: string;
};

/** True when overrides set any key from the provider's exclusive routing groups (FCM: token/tokens/topic/condition). */
export function hasTokenlessRoutingOverride(
  providerId: PushProviderIdEnum,
  overrides: Record<string, unknown> | null | undefined
): boolean {
  if (!overrides) {
    return false;
  }

  const groups = getProviderOverrideConfig(providerId)?.exclusiveKeyGroups;
  let keys: readonly string[] = [];

  if (groups?.length) {
    keys = groups.flat();
  } else if (providerId === PushProviderIdEnum.FCM) {
    keys = FCM_ROUTING_KEYS;
  }

  return keys.some((key) => key in overrides);
}

/**
 * Maps FCM routing overrides onto channel credentials used for token-less send selection.
 * `token` / `condition` only need an empty deviceTokens marker — the provider reads them from bridge data.
 */
export function extractFcmRoutingCredentials(overrides: Record<string, unknown>): PushRoutingCredentials | null {
  if (Array.isArray(overrides.tokens)) {
    return { deviceTokens: overrides.tokens };
  }

  if (typeof overrides.topic === 'string') {
    return { topic: overrides.topic };
  }

  if (typeof overrides.token === 'string' || typeof overrides.condition === 'string') {
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
 * Upserts fully-merged FCM overrides (bridge + trigger) so content-override routing keys
 * participate in synthetic channel construction.
 */
export function upsertMergedFcmRoutingOverride(
  result: PushProviderOverride[],
  command: {
    bridgeData?: Record<string, unknown> | null;
    overrides?: TriggerOverrides;
    step?: { stepId?: string };
  }
): void {
  const mergedFcmOverrides = combineProviderOverrides(
    command.bridgeData,
    command.overrides,
    command.step?.stepId,
    PushProviderIdEnum.FCM
  );

  if (!hasTokenlessRoutingOverride(PushProviderIdEnum.FCM, mergedFcmOverrides)) {
    return;
  }

  const existingIndex = result.findIndex((item) => item.providerId === PushProviderIdEnum.FCM);

  if (existingIndex >= 0) {
    result[existingIndex].overrides = mergedFcmOverrides;
  } else {
    result.push({
      providerId: PushProviderIdEnum.FCM,
      overrides: mergedFcmOverrides,
    });
  }
}
