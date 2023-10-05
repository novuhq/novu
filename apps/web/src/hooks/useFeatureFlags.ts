import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';

import {
  IS_TEMPLATE_STORE_ENABLED,
  IS_MULTI_PROVIDER_CONFIGURATION_ENABLED,
  IS_MULTI_TENANCY_ENABLED,
} from '../config';

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

export const useIsMultiProviderConfigurationEnabled = (): boolean => {
  const value = IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
  const fallbackValue = false;
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  const isMultiProviderConfigurationEnabled = useGetFlagByKey<boolean>(
    FeatureFlagsKeysEnum.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED
  );

  return isMultiProviderConfigurationEnabled ?? defaultValue;
};

export const useIsMultiTenancyEnabled = (): boolean => {
  const value = IS_MULTI_TENANCY_ENABLED;
  const fallbackValue = false;
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  const isMultiTenancyEnabled = useGetFlagByKey<boolean>(FeatureFlagsKeysEnum.IS_MULTI_TENANCY_ENABLED);

  return isMultiTenancyEnabled ?? defaultValue;
};
