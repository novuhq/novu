import { ApiServiceLevelEnum, productFeatureEnabledForServiceLevel, ProductFeatureKeyEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export const useProductFeature = (feature: ProductFeatureKeyEnum) => {
  const { currentOrganization } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(
      productFeatureEnabledForServiceLevel[feature].includes(
        currentOrganization?.apiServiceLevel as ApiServiceLevelEnum
      )
    );
  }, [feature, currentOrganization?.apiServiceLevel]);

  return enabled;
};
