import { FeatureFlagsKeysEnum, IOrganizationEntity, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect } from 'react';
import { checkShouldUseLaunchDarkly } from '../utils/checkShouldUseLaunchDarkly';

import { FEATURE_FLAGS } from '../config';

export const useFeatureFlags = (organization?: IOrganizationEntity) => {
  const ldClient = useLDClient();

  useEffect(() => {
    if (!checkShouldUseLaunchDarkly() || !organization?._id || !ldClient) {
      return;
    }

    ldClient.identify({
      kind: 'organization',
      key: organization._id,
      name: organization.name,
    });
  }, [organization?._id, ldClient, organization?.name]);

  return ldClient;
};

function isFlagMissingInLdResponse(key: FeatureFlagsKeysEnum, keysFromLunchDarkly: { [key: string]: boolean }) {
  return keysFromLunchDarkly[key] === undefined;
}

export const useFeatureFlag = (key: FeatureFlagsKeysEnum): boolean => {
  const shouldUseLaunchDarkly = checkShouldUseLaunchDarkly();
  let flagValue = undefined;

  /** We knowingly break the rule of hooks here to avoid making any LaunchDarkly calls when it is disabled */
  if (shouldUseLaunchDarkly) {
    const flags = useFlags();
    if (!flags || Object.keys(flags).length === 0) {
      throw new Error(
        'No flags were returned by LaunchDarkly, Please ensure that the app is wrapped in an LDProvider!'
      );
    }

    flagValue = flags[key];
  }

  e2eExplicitFlagAssertion(key);
  const fallbackValue = false;
  const value = FEATURE_FLAGS[key];
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  return flagValue ?? defaultValue;
};
/**
 * This function is used to throw an error when a feature flag is not
 * mocked in playwright tests only in the case feature flag is enabled and pulled from launch darkly
 * the purpose of this function is to ensure that all feature flags are mocked
 * in playwright tests and to avoid any unexpected behavior caused by missing mocks when adding a new feature flag ot a piece of UI
 */
function e2eExplicitFlagAssertion(key: FeatureFlagsKeysEnum) {
  const isPlaywright = window && (window as any).isPlaywright;
  const featureFlagValueMap = checkShouldUseLaunchDarkly() ? useFlags() : {};
  const isFeatureFlagsPopulated = Object.keys(featureFlagValueMap).length !== 0;
  if (isFeatureFlagsPopulated && isFlagMissingInLdResponse(key, featureFlagValueMap) && isPlaywright) {
    throw new Error(
      `Feature flag "${key}" Must be mocked in playwright tests use mockFeatureFlags in your test file as a before each
      Existing flags ${JSON.stringify(useFlags() || {})}`
    );
  }
}
