/**
 * Every helper here resolves routing through `resolveExclusiveRoutingKeys`, the same way
 * `FcmPushProvider.readRouting` does, so the channel the worker selects and the destination the
 * provider addresses cannot disagree. That includes honouring `_passthrough.body` as the top of the
 * override chain for routing exactly as it is for content: without it, a passthrough `topic` would
 * leave a token-less subscriber skipped before the provider ever ran.
 */

import {
  FCM_ROUTING_KEYS,
  getProviderOverrideConfig,
  PushProviderIdEnum,
  resolveExclusiveRoutingKeys,
  type TriggerOverrides,
} from '@novu/shared';
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
export function isFcmBroadcastRoutingOverride(overrides: Record<string, unknown> | null | undefined): boolean {
  const routing = resolveExclusiveRoutingKeys(overrides, [FCM_ROUTING_KEYS]);

  return typeof routing.topic === 'string' || typeof routing.condition === 'string';
}

export function hasTokenlessRoutingOverride(
  providerId: PushProviderIdEnum,
  overrides: Record<string, unknown> | null | undefined
): boolean {
  const groups = getProviderOverrideConfig(providerId)?.exclusiveKeyGroups ?? [];

  return Object.keys(resolveExclusiveRoutingKeys(overrides, groups)).length > 0;
}

/**
 * Maps FCM routing overrides onto channel credentials used for token-less send selection.
 * Precedence matches the provider send plan: token > tokens > topic > condition.
 * `token` / `condition` only need an empty deviceTokens marker — the provider reads them from bridge data.
 */
export function extractFcmRoutingCredentials(overrides: Record<string, unknown>): PushRoutingCredentials | null {
  const routing = resolveExclusiveRoutingKeys(overrides, [FCM_ROUTING_KEYS]);

  if (typeof routing.token === 'string') {
    return { deviceTokens: [] };
  }

  if (Array.isArray(routing.tokens)) {
    // Resolution already dropped non-strings so Mongo operators cannot reach $pull token cleanup;
    // filtering again is what narrows the resolved `unknown[]` to the `string[]` credentials need.
    const tokens = routing.tokens.filter((token): token is string => typeof token === 'string');

    if (tokens.length > 0) {
      return { deviceTokens: tokens };
    }
  }

  if (typeof routing.topic === 'string') {
    return { topic: routing.topic };
  }

  if (typeof routing.condition === 'string') {
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
