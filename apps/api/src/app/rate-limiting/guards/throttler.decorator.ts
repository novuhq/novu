import { Reflector } from '@nestjs/core';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum } from '@novu/shared';

export const ThrottlerCategory = Reflector.createDecorator<ApiRateLimitCategoryEnum>();

export const ThrottlerCost = Reflector.createDecorator<ApiRateLimitCostEnum>();
