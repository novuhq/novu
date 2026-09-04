import { getNestedValue } from '../../utils/object';

const DEFAULT_GROUPING = 'default';

export interface IThrottleGrouping {
  throttleKey?: string;
  throttleValue?: string;
}

/**
 * Resolves both supported throttle-key contracts without inferring intent from the rendered value.
 *
 * Stateful workflows expose the configured control value. A bare path keeps the legacy lookup
 * behavior and Redis identity, while a Liquid expression uses the value already rendered by the
 * framework. Stateless workflows only expose the rendered value.
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

  if (configuredThrottleKey) {
    return {};
  }

  return { throttleKey: DEFAULT_GROUPING, throttleValue: DEFAULT_GROUPING };
}
