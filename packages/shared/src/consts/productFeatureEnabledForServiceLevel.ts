import { ApiServiceLevelEnum, ProductFeatureKeyEnum } from '../types';
import { FeatureNameEnum, getFeatureForTierAsBoolean } from './feature-tiers-constants';

const featureAccessAtoFeatureNameMapping: Record<ProductFeatureKeyEnum, FeatureNameEnum> = {
  [ProductFeatureKeyEnum.TRANSLATIONS]: FeatureNameEnum.AUTO_TRANSLATIONS,
  [ProductFeatureKeyEnum.MANAGE_ENVIRONMENTS]: FeatureNameEnum.CUSTOM_ENVIRONMENTS_BOOLEAN,
  [ProductFeatureKeyEnum.WEBHOOKS]: FeatureNameEnum.WEBHOOKS,
} as const;

function createProductFeatureMap(): Record<ProductFeatureKeyEnum, ApiServiceLevelEnum[]> {
  const productFeatures: Record<ProductFeatureKeyEnum, ApiServiceLevelEnum[]> = {
    [ProductFeatureKeyEnum.TRANSLATIONS]: [],
    [ProductFeatureKeyEnum.MANAGE_ENVIRONMENTS]: [],
    [ProductFeatureKeyEnum.WEBHOOKS]: [],
  };

  for (const apiServiceLevel of Object.values(ApiServiceLevelEnum)) {
    for (const [productFeatureKey, featureName] of Object.entries(featureAccessAtoFeatureNameMapping)) {
      const typedProductKey = productFeatureKey as unknown as ProductFeatureKeyEnum;

      if (Object.values(ProductFeatureKeyEnum).includes(typedProductKey)) {
        const isFeatureEnabled = getFeatureForTierAsBoolean(featureName, apiServiceLevel);

        if (isFeatureEnabled) {
          productFeatures[typedProductKey]!.push(apiServiceLevel);
        }
      }
    }
  }

  return Object.freeze(productFeatures);
}

export const productFeatureEnabledForServiceLevel: Record<ProductFeatureKeyEnum, ApiServiceLevelEnum[]> =
  createProductFeatureMap();
