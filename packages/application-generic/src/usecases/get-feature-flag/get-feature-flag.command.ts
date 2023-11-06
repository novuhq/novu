import { IsDefined } from 'class-validator';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from './../../commands';

export class FeatureFlagCommand extends EnvironmentWithUserCommand {}

export class GetGlobalFeatureFlagCommand<T> {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsDefined()
  defaultValue: T;
}

export class GetFeatureFlagCommand<T> extends FeatureFlagCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsDefined()
  defaultValue: T;
}
