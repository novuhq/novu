import { Reflector } from '@nestjs/core';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ThrottlerCategory = Reflector.createDecorator<ApiRateLimitCategoryEnum>();

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ThrottlerCost = Reflector.createDecorator<ApiRateLimitCostEnum>();
