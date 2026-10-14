import {
  getProviderOverrideConfig,
  IChannelCredentials,
  PushProviderIdEnum,
  resolveExclusiveRoutingKeys,
  TriggerOverrides,
  unpackProviderOverrideOutput,
} from '@novu/shared';
import { combineProviderOverrides } from './send-message.base';
import { SendMessageChannelCommand } from './send-message-channel.command';

export interface PushOverrideSource {
  bridgeData?: SendMessageChannelCommand['bridgeData'];
  overrides?: TriggerOverrides;
  step?: {
    stepId?: string;
  };
}

export interface PushRoutingCredentials extends IChannelCredentials {
  topic?: string;
}

/**
 * Single unified interface representing the resolved routing and provider override
 * state for a push channel (either a subscriber's bound integration channel or a
 * synthetic override channel).
 */
export interface ResolvedPushRoute {
  providerId: PushProviderIdEnum;
  integrationIdentifier?: string;
  bridgeProviderData: Record<string, unknown>;
  credentials: PushRoutingCredentials | null;
  hasDestinationOverride: boolean;
  isBroadcast: boolean;
  isIntegrationScoped?: boolean;
  broadcastKey?: string;
}

export interface PushChannelCandidate {
  route: ResolvedPushRoute;
  isMissingDeviceTokens: boolean;
}

export interface PushDeliveryTargets {
  targetDeviceTokens: string[];
  recordedDeviceTokens: string[] | undefined;
}

const FCM_ROUTING_KEYS: readonly string[] =
  getProviderOverrideConfig(PushProviderIdEnum.FCM)?.exclusiveKeyGroups?.[0] ?? [];

const FCM_BROADCAST_KEYS: ReadonlySet<string> = new Set(['topic', 'condition']);

/**
 * Topic and condition address a broadcast target rather than a subscriber's devices,
 * so one send delivers to every recipient and subscriber device fan-out does not apply.
 */
export function isFcmBroadcastRoutingOverride(overrides: Record<string, unknown>): boolean {
  const resolved = resolveExclusiveRoutingKeys(overrides, [FCM_ROUTING_KEYS]);

  return Object.keys(resolved).some((key) => FCM_BROADCAST_KEYS.has(key));
}

export function hasDestinationRoutingOverride(
  providerId: PushProviderIdEnum,
  overrides: Record<string, unknown>
): boolean {
  const groups = getProviderOverrideConfig(providerId)?.exclusiveKeyGroups;
  if (!groups?.length) {
    return false;
  }

  const resolved = resolveExclusiveRoutingKeys(overrides, groups);

  return Object.keys(resolved).length > 0;
}

/**
 * Maps the single winning FCM routing key into the `IChannelCredentials` shape that
 * `SendMessagePush` attaches to synthetic override channels.
 *
 * Non-string entries in `tokens` are dropped so untrusted trigger overrides cannot feed
 * Mongo query-operator objects into `removeInvalidDeviceToken`'s `$pull` filter.
 *
 * `condition` and singular `token` are read by the provider handler from the merged
 * overrides (`bridgeProviderData`), so an empty `deviceTokens` list is enough to create
 * the channel and trigger a single send.
 */
export function extractFcmRoutingCredentials(overrides: Record<string, unknown>): PushRoutingCredentials | null {
  const resolved = resolveExclusiveRoutingKeys(overrides, [FCM_ROUTING_KEYS]);

  if (typeof resolved.topic === 'string') {
    return { topic: resolved.topic };
  }

  if (typeof resolved.condition === 'string') {
    return { deviceTokens: [] };
  }

  if (typeof resolved.token === 'string') {
    return { deviceTokens: [] };
  }

  if (Array.isArray(resolved.tokens)) {
    const validTokens = resolved.tokens.filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0
    );
    if (validTokens.length > 0) {
      return { deviceTokens: validTokens };
    }
  }

  return null;
}

export function extractPushRoutingCredentials(
  providerId: PushProviderIdEnum,
  overrides: Record<string, unknown>
): PushRoutingCredentials | null {
  if (providerId === PushProviderIdEnum.FCM) {
    return extractFcmRoutingCredentials(overrides);
  }

  return null;
}

function getIntegrationOverridesMap(
  source: PushOverrideSource,
  providerId: PushProviderIdEnum
): Record<string, Record<string, unknown>> {
  const rawBridge = (source.bridgeData?.providers as Record<string, unknown> | undefined)?.[providerId];
  const { integrationOverrides } = unpackProviderOverrideOutput(rawBridge);

  return integrationOverrides;
}

function hasIntegrationScopedRoutingOverride(
  source: PushOverrideSource,
  providerId: PushProviderIdEnum,
  integrationIdentifier?: string
): boolean {
  if (!integrationIdentifier) {
    return false;
  }

  const integrationOverride = getIntegrationOverridesMap(source, providerId)[integrationIdentifier];

  return Boolean(integrationOverride && hasDestinationRoutingOverride(providerId, integrationOverride));
}

/**
 * Resolves the effective push route and merged `bridgeProviderData` for a given
 * provider and optional integration identifier in one place.
 */
export function resolvePushRoute(
  source: PushOverrideSource,
  providerId: PushProviderIdEnum,
  integrationIdentifier?: string
): ResolvedPushRoute {
  const bridgeProviderData = combineProviderOverrides(
    source.bridgeData,
    source.overrides as TriggerOverrides | undefined,
    source.step?.stepId,
    providerId,
    integrationIdentifier
  );
  const credentials = extractPushRoutingCredentials(providerId, bridgeProviderData);
  const hasDestinationOverride = credentials !== null;
  const isBroadcast = providerId === PushProviderIdEnum.FCM && isFcmBroadcastRoutingOverride(bridgeProviderData);
  const isIntegrationScoped = hasIntegrationScopedRoutingOverride(source, providerId, integrationIdentifier);

  return {
    providerId,
    integrationIdentifier,
    bridgeProviderData,
    credentials,
    hasDestinationOverride,
    isBroadcast,
    ...(hasDestinationOverride && { isIntegrationScoped }),
    ...(isBroadcast && {
      broadcastKey: isIntegrationScoped ? `${providerId}:${integrationIdentifier}` : providerId,
    }),
  };
}

export function createUnroutedPushRoute(providerId: PushProviderIdEnum): ResolvedPushRoute {
  return {
    providerId,
    bridgeProviderData: {},
    credentials: null,
    hasDestinationOverride: false,
    isBroadcast: false,
  };
}

/**
 * Returns the candidate integration targets (`undefined` for provider/trigger-level
 * overrides, and specific integration `identifier` strings for `integrationOverrides`
 * entries) that carry a destination routing override for `providerId`.
 */
export function getCandidatePushRouteTargets(
  source: PushOverrideSource,
  providerId: PushProviderIdEnum
): Array<string | undefined> {
  const targets: Array<string | undefined> = [];

  if (resolvePushRoute(source, providerId).hasDestinationOverride) {
    targets.push(undefined);
  }

  const integrationOverrides = getIntegrationOverridesMap(source, providerId);
  for (const identifier of Object.keys(integrationOverrides)) {
    if (resolvePushRoute(source, providerId, identifier).hasDestinationOverride) {
      targets.push(identifier);
    }
  }

  return targets;
}

/**
 * Checks whether the command carries any candidate destination routing override for
 * `providerId` — either at the provider/trigger level or inside `integrationOverrides` —
 * so the caller can avoid querying the database when no routing override exists.
 */
export function hasCandidatePushRoutingOverride(source: PushOverrideSource, providerId: PushProviderIdEnum): boolean {
  return getCandidatePushRouteTargets(source, providerId).length > 0;
}

function getRouteScopeKey(route: ResolvedPushRoute): string {
  if (route.isIntegrationScoped && route.integrationIdentifier) {
    return `${route.providerId}:${route.integrationIdentifier}`;
  }

  return route.providerId;
}

interface PushSelectionContext {
  overrideProviderIds: ReadonlySet<PushProviderIdEnum>;
  populatedRoutedProviders: ReadonlySet<PushProviderIdEnum>;
  providerWideBroadcastIds: ReadonlySet<PushProviderIdEnum>;
  seenBroadcastKeys: Set<string>;
  seenTokenlessOverrideKeys: Set<string>;
}

function shouldSelectTokenlessCandidate(channel: PushChannelCandidate, context: PushSelectionContext): boolean {
  const { route } = channel;

  if (!route.hasDestinationOverride) {
    return !context.overrideProviderIds.has(route.providerId);
  }

  if (!route.isIntegrationScoped && context.populatedRoutedProviders.has(route.providerId)) {
    return false;
  }

  const scopeKey = getRouteScopeKey(route);
  if (context.seenTokenlessOverrideKeys.has(scopeKey)) {
    return false;
  }

  context.seenTokenlessOverrideKeys.add(scopeKey);

  return true;
}

function shouldSelectPushCandidate(channel: PushChannelCandidate, context: PushSelectionContext): boolean {
  const { route } = channel;

  if (route.isBroadcast) {
    const key = route.broadcastKey ?? getRouteScopeKey(route);
    if (context.seenBroadcastKeys.has(key)) {
      return false;
    }

    context.seenBroadcastKeys.add(key);

    return true;
  }

  if (!route.hasDestinationOverride && context.providerWideBroadcastIds.has(route.providerId)) {
    return false;
  }

  if (channel.isMissingDeviceTokens) {
    return shouldSelectTokenlessCandidate(channel, context);
  }

  return true;
}

/**
 * Reusable channel selection and deduplication across subscriber push channels and
 * synthetic override push channels using their already-resolved `ResolvedPushRoute`.
 *
 * - Provider-wide broadcast routes (`broadcastKey === providerId`) collapse subscriber
 *   fan-out for that provider into a single broadcast send, while explicit
 *   integration-scoped broadcast routes (`broadcastKey === `${providerId}:${identifier}``)
 *   deduplicate per integration so distinct integrations can each broadcast.
 * - Token-less subscriber channels without a destination override are dropped when a
 *   synthetic override channel for the same provider can deliver instead.
 */
export function selectPushChannels<T extends PushChannelCandidate>(
  subscriberChannels: T[],
  overrideChannels: T[]
): T[] {
  const allCandidates = [...subscriberChannels, ...overrideChannels];

  const context: PushSelectionContext = {
    overrideProviderIds: new Set(
      allCandidates.filter((c) => c.route.hasDestinationOverride).map((c) => c.route.providerId)
    ),
    populatedRoutedProviders: new Set(
      subscriberChannels
        .filter((c) => !c.isMissingDeviceTokens && c.route.hasDestinationOverride)
        .map((c) => c.route.providerId)
    ),
    providerWideBroadcastIds: new Set(
      allCandidates
        .filter((c) => c.route.isBroadcast && c.route.broadcastKey === c.route.providerId)
        .map((c) => c.route.providerId)
    ),
    seenBroadcastKeys: new Set<string>(),
    seenTokenlessOverrideKeys: new Set<string>(),
  };

  return allCandidates.filter((channel) => shouldSelectPushCandidate(channel, context));
}

/**
 * Resolves the per-channel device token loop targets and the tokens recorded on the
 * persisted `MessageEntity` from a channel's `ResolvedPushRoute`.
 */
export function resolvePushDeliveryTargets(
  route: ResolvedPushRoute,
  subscriberTarget: string[] | undefined
): PushDeliveryTargets {
  if (route.hasDestinationOverride) {
    return {
      targetDeviceTokens: [''],
      recordedDeviceTokens: route.credentials?.deviceTokens,
    };
  }

  return {
    targetDeviceTokens: subscriberTarget || [],
    recordedDeviceTokens: subscriberTarget,
  };
}
