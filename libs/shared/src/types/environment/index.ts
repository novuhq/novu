export type EnvironmentId = string;

export enum RateLimitCategoryTypeEnum {
  TRIGGER = 'trigger',
  CONFIGURATION = 'configuration',
  GLOBAL = 'global',
}

export type IRateLimits = Record<RateLimitCategoryTypeEnum, number>;
