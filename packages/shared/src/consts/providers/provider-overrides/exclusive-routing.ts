import { isRecord } from './path';

export type ResolvedRoutingValue = string | string[];
export type ResolvedExclusiveRouting = Record<string, ResolvedRoutingValue>;

/**
 * Reduces a routing value to the destinations a provider can address and the worker can record, or
 * `undefined` when nothing usable is left. `_passthrough` is unvalidated, so this is the point where
 * a `{ $exists: true }` smuggled in as `tokens` is dropped — it must never reach the Mongo `$pull`
 * that prunes invalid device tokens.
 */
function sanitizeRoutingValue(value: unknown): ResolvedRoutingValue | undefined {
  if (typeof value === 'string') {
    return value.length > 0 ? value : undefined;
  }

  if (Array.isArray(value)) {
    const entries = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);

    return entries.length > 0 ? entries : undefined;
  }

  return undefined;
}

function readPassthroughBody(overrides: Record<string, unknown>): Record<string, unknown> {
  const passthrough = overrides._passthrough;

  if (!isRecord(passthrough) || !isRecord(passthrough.body)) {
    return {};
  }

  return passthrough.body;
}

/**
 * Claims at most one key from the group — the first in group order with a usable value.
 * Group order is send-plan precedence (for FCM: token > topic > condition > tokens). Topic is
 * before tokens so a layer that sets both keeps the legacy topic send path. Callers do not
 * re-break ties and broadcast detection cannot disagree with the destination that is sent.
 */
function claimGroup(layer: Record<string, unknown>, group: readonly string[]): ResolvedExclusiveRouting | undefined {
  for (const key of group) {
    if (!Object.hasOwn(layer, key)) {
      continue;
    }

    const sanitized = sanitizeRoutingValue(layer[key]);

    if (sanitized !== undefined) {
      return { [key]: sanitized };
    }
  }

  return undefined;
}

/**
 * Resolves the effective values of mutually exclusive routing keys, treating `_passthrough.body` as
 * the highest-precedence layer the same way `BaseProvider.transform` merges it last.
 *
 * A group is claimed by the first layer that sets any of its keys to a usable value,
 * `_passthrough.body` first: a passthrough `topic` evicts a typed `tokens` instead of blending into
 * a message with two destinations the provider cannot address at once. Within a claiming layer only
 * the first usable key in group order is kept. Values come back sanitized so the worker's routing
 * bookkeeping and the provider's send target cannot disagree.
 *
 * @param overrides One provider's fully merged overrides, `_passthrough` included.
 * @param exclusiveKeyGroups The provider's `exclusiveKeyGroups`, e.g. `[FCM_ROUTING_KEYS]`.
 */
export function resolveExclusiveRoutingKeys(
  overrides: Record<string, unknown> | null | undefined,
  exclusiveKeyGroups: readonly (readonly string[])[]
): ResolvedExclusiveRouting {
  if (!overrides || exclusiveKeyGroups.length === 0) {
    return {};
  }

  const passthroughBody = readPassthroughBody(overrides);
  const resolved: ResolvedExclusiveRouting = {};

  for (const group of exclusiveKeyGroups) {
    const claimed = claimGroup(passthroughBody, group) ?? claimGroup(overrides, group);

    if (claimed) {
      Object.assign(resolved, claimed);
    }
  }

  return resolved;
}
