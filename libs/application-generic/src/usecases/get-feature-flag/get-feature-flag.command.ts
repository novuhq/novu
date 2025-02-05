import { IsDefined, IsOptional } from 'class-validator';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands';

export class GetFeatureFlagCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsOptional()
  readonly environmentCreatedAt?: string;

  @IsOptional()
  readonly count?: number;
}
