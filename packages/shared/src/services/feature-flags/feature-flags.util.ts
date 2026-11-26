export const prepareBooleanStringFeatureFlag = (value: string | undefined, defaultValue: boolean) => {
  if (!value) {
    return defaultValue;
  }

  return value === 'true';
};

/**
 * Flags forced to a value, whatever LaunchDarkly serves: a JSON object of flag key to value, e.g.
 * `{"IS_X_ENABLED":true}`. A Novu Box sets it to force a flag on for that box only.
 */
export const parseFeatureFlagOverrides = (value: string | undefined): Readonly<Record<string, unknown>> => {
  if (!value) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Feature flag overrides must be a JSON object of flag key to value, got: ${value}`);
  }

  return parsed as Record<string, unknown>;
};

export const prepareNumberStringFeatureFlag = (
  value: string | undefined,
  defaultValue: number | undefined
): number | undefined => {
  if (value) {
    return parseInt(value, 10);
  }

  return defaultValue;
};
