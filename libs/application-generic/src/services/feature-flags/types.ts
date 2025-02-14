import { EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum, type FlagType } from '@novu/shared';

export interface IFeatureFlagContext<T extends FeatureFlagsKeysEnum> {
  key: T;
  defaultValue: FlagType<T>;
  environment?: Partial<EnvironmentEntity>;
  organization?: Partial<OrganizationEntity>;
  user?: Partial<UserEntity>;
}

export interface IFeatureFlagsService {
  isEnabled: boolean;

  initialize: () => Promise<void>;

  gracefullyShutdown: () => Promise<void>;

  getBooleanFlag<T extends FeatureFlagsKeysEnum>(context: IFeatureFlagContext<T>): Promise<boolean>;

  getNumberFlag<T extends FeatureFlagsKeysEnum>(context: IFeatureFlagContext<T>): Promise<number>;
}
