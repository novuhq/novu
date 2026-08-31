import { getNestedValue } from '../../utils/object';

const DEFAULT_GROUPING = 'default';

/**
 * Resolves the Redis grouping value for a throttle step.
 *
 * `throttleKey` is one field with two historical contracts:
 * - Dashboard persists `{{payload.orderId}}`; Liquid compiles it to the value before the worker runs.
 * - API / older workflows persist a bare payload path (`userId`); that string is still a lookup key.
 *
 * Prefer a payload lookup so existing path-based Redis keys stay stable. If the compiled string is not
 * a path in the payload, treat it as the grouping value (dashboard / digest-style).
 */
export function resolveThrottleGrouping(
  compiledThrottleKey: unknown,
  payload: unknown
): { throttleKey: string; throttleValue: string } {
  if (compiledThrottleKey === undefined || compiledThrottleKey === null || compiledThrottleKey === '') {
    return { throttleKey: DEFAULT_GROUPING, throttleValue: DEFAULT_GROUPING };
  }

  const compiled = String(compiledThrottleKey);
  const nested = getNestedValue(payload as Record<string, unknown>, compiled);

  if (nested === undefined || nested === null) {
    return { throttleKey: compiled, throttleValue: compiled };
  }

  return { throttleKey: compiled, throttleValue: String(nested) };
}
