import { FeatureFlagsKeysEnum, IOrganizationEntity, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect } from 'react';
import { checkShouldUseLaunchDarkly } from '../utils/checkShouldUseLaunchDarkly';

import { FEATURE_FLAGS } from '../config';

export const useFeatureFlag = (key: FeatureFlagsKeysEnum): boolean => {
  /** We knowingly break the rule of hooks here to avoid making any LaunchDarkly calls when it is disabled */
  // eslint-disable-next-line
  const flagValue = checkShouldUseLaunchDarkly() ? useFlags()[key] : undefined;
  const fallbackValue = false;
  const value = FEATURE_FLAGS[key];
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  return flagValue ?? defaultValue;
};
