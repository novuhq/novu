import { EnvironmentId, OrganizationId, UserId } from '@novu/shared';

export { EnvironmentId, OrganizationId, UserId };

export enum FeatureFlagsKeysEnum {
  IS_TEMPLATE_STORE_ENABLED = 'IS_TEMPLATE_STORE_ENABLED',
}

export interface IFeatureFlagContext {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  userId: UserId;
}

export interface IFeatureFlagsService {
  getWithEnvironmentContext: <T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    environmentId: EnvironmentId
  ) => Promise<T>;
  getWithOrganizationContext: <T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    organizationId: OrganizationId
  ) => Promise<T>;
  getWithUserContext: <T>(key: FeatureFlagsKeysEnum, defaultValue: T, userId: UserId) => Promise<T>;
  gracefullyShutdown: () => Promise<void>;
  initialize: () => Promise<void>;
}
