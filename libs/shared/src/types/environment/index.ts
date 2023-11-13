export type EnvironmentId = string;

export enum ApiRateLimitCategoryTypeEnum {
  TRIGGER = 'trigger',
  CONFIGURATION = 'configuration',
  GLOBAL = 'global',
}

export type IApiRateLimits = Record<ApiRateLimitCategoryTypeEnum, number>;
