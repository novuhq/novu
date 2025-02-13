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

  getWithFullContext: <T>({
    key,
    defaultValue,
    contextKey,
    contextId,
    attributes,
  }: {
    key: FeatureFlagsKeysEnum;
    defaultValue: T;
    contextKey: 'environment' | 'organization' | 'user';
    contextId: string;
    attributes?: Record<string, unknown>;
  }) => Promise<T>;

  gracefullyShutdown: () => Promise<void>;

  initialize: () => Promise<void>;

  isEnabled: boolean;
}

export type FeatureFlagContext<T> = {
  key: FeatureFlagsKeysEnum;

  defaultValue: T;

  contextKey: 'environment' | 'organization' | 'user';

  contextId: string;

  /*
   * If the Launch Darkly flag value matches the fallbackToDefault number, return defaultValue instead.
   * This allows configuring different fallback behaviors per feature flag by setting distinct fallbackToDefault values.
   */
  fallbackToDefault?: number;

  attributes?: Record<string, unknown>;
};
