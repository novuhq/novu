import { Reflector, type ReflectableDecorator } from '@nestjs/core';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum } from '@novu/shared';

export const ThrottlerCategory: ReflectableDecorator<ApiRateLimitCategoryEnum> =
  Reflector.createDecorator<ApiRateLimitCategoryEnum>();

export const ThrottlerCost: ReflectableDecorator<ApiRateLimitCostEnum> =
  Reflector.createDecorator<ApiRateLimitCostEnum>();
