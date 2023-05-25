import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';

const prepareBooleanStringFeatureFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  const preparedValue = value == 'true';

  return preparedValue || defaultValue;
};

export const useIsTemplateStoreEnabled = (): Promise<boolean> => {
  const value = process.env.IS_TEMPLATE_STORE_ENABLED;
  const fallbackValue = false;
  const defaultValue = prepareBooleanStringFeatureFlag(value, fallbackValue);

  const isTemplateStoreEnabled = useGetFlagByKey<boolean>(FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED);

  return isTemplateStoreEnabled ?? defaultValue;
};

const useGetFlagByKey = <T>(key: FeatureFlagsKeysEnum): Promise<T> => {
  const { [key]: featureFlag } = useFlags();

  return featureFlag;
};
