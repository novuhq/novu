import { ApiServiceLevelEnum } from '@novu/shared';

// Array type to keep the cached entity as small as possible for more performant caching
export type GetApiRateLimitMaximumDto = [apiRateLimitMaximum: number, apiServiceLevel: ApiServiceLevelEnum];
