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
  type ResolvedExclusiveRouting,
  resolveExclusiveRoutingKeys,
  unpackProviderOverrideOutput,
} from '@novu/shared';
import { combineProviderOverrides } from './send-message.base';
import { SendMessageChannelCommand } from './send-message-channel.command';

export type PushRoutingCredentials = {
  deviceTokens?: string[];
  topic?: string;
};

type PushOverrideSource = Pick<SendMessageChannelCommand, 'bridgeData' | 'overrides' | 'step'>;

/**
 * `destination` is the claimed routing key (FCM: `token` / `tokens` / `topic` / `condition`), empty when
 * none is set. A claimed key *is* the destination — `FcmPushProvider.resolveSendPlan` ignores the
 * subscriber targets — so such a send needs no stored device token and must not fan out over them.
 */
export type ResolvedPushRoute = {
  bridgeProviderData: Record<string, unknown>;
  destination: ResolvedExclusiveRouting;
  credentials: PushRoutingCredentials | null;
};

/** FCM topic/condition sends are broadcast — they must not fan out per subscriber device token. */
export function isFcmBroadcastRoutingOverride(overrides: Record<string, unknown> | null | undefined): boolean {
  const routing = resolveExclusiveRoutingKeys(overrides, [FCM_ROUTING_KEYS]);

  return 'topic' in routing || 'condition' in routing;
}

/**
 * Maps FCM routing overrides onto channel credentials used for token-less send selection.
 * `resolveExclusiveRoutingKeys` already returns at most one routing key (`FCM_ROUTING_KEYS` order).
 * `token` / `condition` only need an empty deviceTokens marker — the provider reads them from bridge data.
 */
export function extractFcmRoutingCredentials(overrides: Record<string, unknown>): PushRoutingCredentials | null {
  const routing = resolveExclusiveRoutingKeys(overrides, [FCM_ROUTING_KEYS]);

  if (typeof routing.token === 'string') {
    return { deviceTokens: [] };
  }

  if (typeof routing.topic === 'string') {
    return { topic: routing.topic };
  }

  if (typeof routing.condition === 'string') {
    return { deviceTokens: [] };
  }

  if (Array.isArray(routing.tokens)) {
    return { deviceTokens: routing.tokens };
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
 * Resolves the overrides delivered to the provider for one integration, so channel selection and
 * device-token fan-out see the same `__nvIntegrationOverrides__` entry that delivery does.
 * Without `integrationIdentifier` only the provider-wide layers apply.
 */
export function resolvePushRoute(
  source: PushOverrideSource,
  providerId: PushProviderIdEnum,
  integrationIdentifier?: string
): ResolvedPushRoute {
  const bridgeProviderData = combineProviderOverrides(
    source.bridgeData,
    source.overrides,
    source.step?.stepId,
    providerId,
    integrationIdentifier
  );
  const groups = getProviderOverrideConfig(providerId)?.exclusiveKeyGroups ?? [];

  return {
    bridgeProviderData,
    destination: resolveExclusiveRoutingKeys(bridgeProviderData, groups),
    credentials: extractPushRoutingCredentials(providerId, bridgeProviderData),
  };
}

export function getIntegrationOverrideIdentifiers(
  source: PushOverrideSource,
  providerId: PushProviderIdEnum
): string[] {
  const providers = source.bridgeData?.providers as Record<string, unknown> | undefined;

  return Object.keys(unpackProviderOverrideOutput(providers?.[providerId]).integrationOverrides);
}
