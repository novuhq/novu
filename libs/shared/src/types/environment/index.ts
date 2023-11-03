export type EnvironmentId = string;

export enum RateLimitCategoryTypeEnum {
  TRIGGER = 'trigger',
  CONFIGURATION = 'configuration',
  GLOBAL = 'global',
}

export type IApiRateLimits = Record<RateLimitCategoryTypeEnum, number>;
