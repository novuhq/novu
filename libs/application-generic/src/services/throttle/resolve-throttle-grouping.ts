import { getNestedValue } from '../../utils/object';

const DEFAULT_GROUPING = 'default';

export interface IThrottleGrouping {
  throttleKey?: string;
  throttleValue?: string;
}

/**
 * Redis suffix appended after `throttle:<env>:<subscriber>:<workflow>:<step>`.
 * Keep this identical to production `buildSetKey` so in-flight windows survive deploy.
 */
export function buildThrottleGroupingSuffix(grouping: IThrottleGrouping): string {
  return grouping.throttleKey && grouping.throttleValue !== undefined
    ? `:${grouping.throttleKey}:${grouping.throttleValue}`
    : '';
}

/**
 * Resolves throttle grouping without inferring a payload path from a rendered value.
 *
 * Production identities that must stay byte-identical:
 * - no custom key → `:default:default`
 * - bare payload path with a value → `:<path>:<value>`
 * - bare payload path with a missing value → ungrouped (`''`)
 * - Liquid/custom key with a missing/empty value → `:default:default` (falsy compiled output)
 *
 * Dashboard/Liquid keys with a real value used to collapse onto the ungrouped key because the
 * compiled value was looked up as a path. That is the bug this change fixes; those windows reset
 * once onto a per-value identity.
 */
export function resolveThrottleGrouping(
  configuredThrottleKey: unknown,
  resolvedThrottleValue: unknown,
  payload: unknown
): IThrottleGrouping {
  if (typeof configuredThrottleKey === 'string' && configuredThrottleKey && !configuredThrottleKey.includes('{{')) {
    const payloadValue = getNestedValue(payload as Record<string, unknown>, configuredThrottleKey);

    return {
      throttleKey: configuredThrottleKey,
      throttleValue: payloadValue === undefined ? undefined : String(payloadValue),
    };
  }

  if (resolvedThrottleValue !== undefined && resolvedThrottleValue !== null && resolvedThrottleValue !== '') {
    const value = String(resolvedThrottleValue);

    return { throttleKey: value, throttleValue: value };
  }

  return { throttleKey: DEFAULT_GROUPING, throttleValue: DEFAULT_GROUPING };
}
