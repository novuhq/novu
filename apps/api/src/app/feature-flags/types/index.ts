import { EnvironmentId, OrganizationId, UserId } from '@novu/shared';

export { EnvironmentId, OrganizationId, UserId };

// This will become an enum with the keys.
export type FeatureFlagKey = string;

export interface IFeatureFlagContext {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  userId: UserId;
}

export interface IFeatureFlagsService {
  getWithEnvironmentContext: <T>(key: FeatureFlagKey, defaultValue: T, environmentId: EnvironmentId) => Promise<T>;
  getWithOrganizationContext: <T>(key: FeatureFlagKey, defaultValue: T, organizationId: OrganizationId) => Promise<T>;
  getWithUserContext: <T>(key: FeatureFlagKey, defaultValue: T, userId: UserId) => Promise<T>;
  gracefullyShutdown: () => Promise<void>;
  initialize: () => Promise<void>;
}
