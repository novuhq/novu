import { ApiServiceLevelEnum, productFeatureEnabledForServiceLevel, ProductFeatureKeyEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { useAuthController } from './useAuthController';

export const useProductFeature = (feature: ProductFeatureKeyEnum) => {
  const { organization } = useAuthController();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(
      productFeatureEnabledForServiceLevel[feature].includes(organization?.apiServiceLevel as ApiServiceLevelEnum)
    );
  }, [feature, organization?.apiServiceLevel]);

  return enabled;
};
