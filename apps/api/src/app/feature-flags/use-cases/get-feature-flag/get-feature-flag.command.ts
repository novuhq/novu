import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsDefined } from 'class-validator';

import { FeatureFlagKey } from '../../types';

export class GetFeatureFlagCommand<T> extends EnvironmentWithUserCommand {
  @IsDefined()
  key: FeatureFlagKey;

  @IsDefined()
  defaultValue: T;
}
