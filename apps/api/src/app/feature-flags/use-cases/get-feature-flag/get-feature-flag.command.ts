import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsDefined } from 'class-validator';

import { FeatureFlagsKeysEnum } from '../../types';

export class FeatureFlagCommand extends EnvironmentWithUserCommand {}

export class GetFeatureFlagCommand<T> extends FeatureFlagCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsDefined()
  defaultValue: T;
}
