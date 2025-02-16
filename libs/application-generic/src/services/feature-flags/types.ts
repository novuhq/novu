import { EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export type FeatureFlagContextBase = {
  environment?: Partial<EnvironmentEntity>;
  organization?: Partial<OrganizationEntity>;
  user?: Partial<UserEntity>;
};

export type FeatureFlagContext<T_Result> = FeatureFlagContextBase & {
  key: FeatureFlagsKeysEnum;
  defaultValue: T_Result;
};
export interface IFeatureFlagsService {
  isEnabled: boolean;

  initialize: () => Promise<void>;

  gracefullyShutdown: () => Promise<void>;

  getFlag: <T_Result>(context: FeatureFlagContext<T_Result>) => Promise<T_Result>;
}
