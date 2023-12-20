import { ApiServiceLevelEnum } from '@novu/shared';

export const CUSTOM_API_SERVICE_LEVEL = 'custom';

export type ApiServiceLevel = ApiServiceLevelEnum | typeof CUSTOM_API_SERVICE_LEVEL;

// Array type to keep the cached entity as small as possible for more performant caching
export type GetApiRateLimitMaximumDto = [apiRateLimitMaximum: number, apiServiceLevel: ApiServiceLevel];
