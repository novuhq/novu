export type EnvironmentId = string;

export enum EnvironmentEnum {
  DEVELOPMENT = 'Development',
  PRODUCTION = 'Production',
}

export const PROTECTED_ENVIRONMENTS = [EnvironmentEnum.DEVELOPMENT, EnvironmentEnum.PRODUCTION] as const;

export type EnvironmentName = EnvironmentEnum | string;
