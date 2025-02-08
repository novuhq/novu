import { ApiServiceLevelEnum, ProductFeatureKeyEnum } from '../types';

export const productFeatureEnabledForServiceLevel: Record<ProductFeatureKeyEnum, ApiServiceLevelEnum[]> = Object.freeze(
  {
    [ProductFeatureKeyEnum.TRANSLATIONS]: [ApiServiceLevelEnum.BUSINESS, ApiServiceLevelEnum.ENTERPRISE],
    [ProductFeatureKeyEnum.MANAGE_ENVIRONMENTS]: [ApiServiceLevelEnum.BUSINESS, ApiServiceLevelEnum.ENTERPRISE],
  }
);
