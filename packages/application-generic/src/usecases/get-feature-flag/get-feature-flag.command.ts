import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from './../../commands';
import { FeatureFlagsKeysEnum } from '../../services/types';

export class FeatureFlagCommand extends EnvironmentWithUserCommand {}

export class GetFeatureFlagCommand<T> extends FeatureFlagCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsDefined()
  defaultValue: T;
}
