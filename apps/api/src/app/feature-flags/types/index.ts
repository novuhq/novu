import { EnvironmentId, OrganizationId, UserId } from '@novu/shared';

// This will become an enum with the keys.
export type FeatureFlagKey = string;

export interface IFeatureFlagContext {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  userId: UserId;
}

export interface IFeatureFlagsService {
  initialize: () => Promise<void>;
  get: <T>(key: FeatureFlagKey, context: IFeatureFlagContext, defaultValue: T) => Promise<T>;
  gracefullyShutdown: () => Promise<void>;
}
