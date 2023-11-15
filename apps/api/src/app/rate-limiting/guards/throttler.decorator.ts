import { Reflector } from '@nestjs/core';
import { ApiRateLimitCategoryTypeEnum } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ThrottlerCategory = Reflector.createDecorator<ApiRateLimitCategoryTypeEnum>();

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ThrottlerBulk = Reflector.createDecorator<boolean>();
