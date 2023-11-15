import { ApiRateLimitCategoryTypeEnum, IApiRateLimits } from '../environment';
import { ApiServiceLevelTypeEnum } from '../organization';

export type IServiceApiRateLimits = Record<ApiServiceLevelTypeEnum, IApiRateLimits>;

type ApiRateLimitNamespace = 'API_RATE_LIMIT';

export type ApiRateLimitEnvVarFormat =
  Uppercase<`${ApiRateLimitNamespace}_${ApiServiceLevelTypeEnum}_${ApiRateLimitCategoryTypeEnum}`>;
