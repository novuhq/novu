import { FeatureFlagsKeysEnum, IOrganizationEntity } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect } from 'react';

import { IS_TEMPLATE_STORE_ENABLED, IS_MULTI_TENANCY_ENABLED, IS_TRANSLATION_MANAGER_ENABLED } from '../config';

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

const prepareBooleanStringFeatureFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  const preparedValue = value === 'true';

  return preparedValue || defaultValue;
};

const useGetFlagByKey = <T>(key: FeatureFlagsKeysEnum): T => {
  const { [key]: featureFlag } = useFlags();

  return featureFlag;
};

export const useIsTemplateStoreEnabled = (): boolean => {
  const value = IS_TEMPLATE_STORE_ENABLED;
  const fallbackValue = false;
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  const isTemplateStoreEnabled = useGetFlagByKey<boolean>(FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED);

  return isTemplateStoreEnabled ?? defaultValue;
};

export const useIsMultiTenancyEnabled = (): boolean => {
  const value = IS_MULTI_TENANCY_ENABLED;
  const fallbackValue = false;
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  const isMultiTenancyEnabled = useGetFlagByKey<boolean>(FeatureFlagsKeysEnum.IS_MULTI_TENANCY_ENABLED);

  return isMultiTenancyEnabled ?? defaultValue;
};

export const useIsTranslationManagerEnabled = (): boolean => {
  const value = IS_TRANSLATION_MANAGER_ENABLED;
  const fallbackValue = false;
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  const isTranslationManagerEnabled = useGetFlagByKey<boolean>(FeatureFlagsKeysEnum.IS_TRANSLATION_MANAGER_ENABLED);

  return isTranslationManagerEnabled ?? defaultValue;
};
