import { ApiServiceLevelEnum, productFeatureEnabledForServiceLevel, ProductFeatureKeyEnum } from '@novu/shared';
import { useAuthController } from './useAuthController';
import { useMemo } from 'react';

export const useProductFeature = (feature: ProductFeatureKeyEnum) => {
  const { organization } = useAuthController();

  return useMemo(
    () => productFeatureEnabledForServiceLevel[feature].includes(organization?.apiServiceLevel as ApiServiceLevelEnum),
    [feature, organization.apiServiceLevel]
  );
};
