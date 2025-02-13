import { EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
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
}

export interface IGlobalFeatureFlag<T> {
  key: FeatureFlagsKeysEnum;
  defaultValue: T;
}

export type IContextualFeatureFlag<T> = IGlobalFeatureFlag<T> &
  IFeatureFlagContext;

export type GetFlagData<T> = {
  key: FeatureFlagsKeysEnum;
  defaultValue: T;
  user?: UserEntity;
  organization?: OrganizationEntity;
  environment?: EnvironmentEntity;
};

export interface IFeatureFlagsService {
  getWithAnonymousContext: <T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
  ) => Promise<T>;

  getWithEnvironmentContext: <T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    organizationId: OrganizationId,
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

  getFlag<T>(getFlagData: GetFlagData<T>): Promise<T>;

  gracefullyShutdown: () => Promise<void>;

  initialize: () => Promise<void>;

  isEnabled: boolean;
}

export type FeatureFlagContext<T> = {
  key: FeatureFlagsKeysEnum;

  defaultValue: T;

  environment?: EnvironmentEntity;

  organization?: OrganizationEntity;

  user?: UserEntity;

  anonymous?: boolean;
};
