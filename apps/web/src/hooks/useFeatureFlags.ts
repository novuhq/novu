import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';

import { IS_TEMPLATE_STORE_ENABLED } from '../config';
import { isBrowser } from '../utils';

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

export const useIsIntegrationsListPageEnabled = (): boolean => {
  // TODO refactor this when the feature flag is enabled for all environments, temporary solution for Cypress
  const isCypress = (isBrowser() && (window as any).Cypress) || (isBrowser() && (window as any).parent.Cypress);

  return isCypress && typeof window._cypress.IS_INTEGRATIONS_LIST_PAGE_ENABLED !== 'undefined'
    ? window._cypress.IS_INTEGRATIONS_LIST_PAGE_ENABLED === 'true'
    : true;
};
