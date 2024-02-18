import { FeatureFlagsKeysEnum, IOrganizationEntity, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect } from 'react';

import { FEATURE_FLAGS } from '../config';

export const useFeatureFlags = (organization: IOrganizationEntity) => {
  const ldClient = useLDClient();

  useEffect(() => {
    if (!organization?._id) {
      return;
    }

    ldClient?.identify({
      kind: 'organization',
      key: organization._id,
      name: organization.name,
    });
  }, [organization?._id, ldClient, organization?.name]);

  return ldClient;
};

export const useFeatureFlag = (key: FeatureFlagsKeysEnum): boolean => {
  const { [key]: featureFlag } = useFlags();
  const fallbackValue = false;
  const value = FEATURE_FLAGS[key];
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  return featureFlag ?? defaultValue;
};
