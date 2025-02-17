import { EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum, type FlagType } from '@novu/shared';

type PartialWithId<T> = Partial<T> & { _id: string };

export interface IFeatureFlagContext<T extends FeatureFlagsKeysEnum> {
  key: T;
  defaultValue: FlagType<T>;
  environment?: PartialWithId<EnvironmentEntity>;
  organization?: PartialWithId<OrganizationEntity>;
  user?: PartialWithId<UserEntity>;
}

export interface IFeatureFlagsService {
  isEnabled: boolean;

  initialize: () => Promise<void>;

  gracefullyShutdown: () => Promise<void>;

  getBooleanFlag<T extends FeatureFlagsKeysEnum>(context: IFeatureFlagContext<T>): Promise<boolean>;

  getNumberFlag<T extends FeatureFlagsKeysEnum>(context: IFeatureFlagContext<T>): Promise<number>;
}
