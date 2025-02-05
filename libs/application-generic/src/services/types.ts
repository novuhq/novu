import {
  EnvironmentId,
  FeatureFlagsKeysEnum,
  OrganizationId,
  UserId,
} from '@novu/shared';

export { EnvironmentId, FeatureFlagsKeysEnum, OrganizationId, UserId };

export interface IFeatureFlagContext {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  userId: UserId;
  [attribute: string]: unknown;
}

export interface IGlobalFeatureFlag<T> {
  key: FeatureFlagsKeysEnum;
  defaultValue: T;
}

export type IContextualFeatureFlag<T> = IGlobalFeatureFlag<T> &
  IFeatureFlagContext;

export interface IFeatureFlagsService {
  getWithAnonymousContext: <T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
  ) => Promise<T>;

  getWithEnvironmentContext: <T, V_Context>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    environmentId: EnvironmentId,
    context?: V_Context,
  ) => Promise<T>;

  getWithOrganizationContext: <T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    organizationId: OrganizationId,
  ) => Promise<T>;

  getWithUserContext: <T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    userId: UserId,
  ) => Promise<T>;

  gracefullyShutdown: () => Promise<void>;

  initialize: () => Promise<void>;

  isEnabled: boolean;
}
