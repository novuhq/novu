import { Reflector } from '@nestjs/core';
import { ApiRateLimitCategoryTypeEnum } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ThrottleCategory = Reflector.createDecorator<ApiRateLimitCategoryTypeEnum>();
