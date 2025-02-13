import { IsDefined, IsNumber, IsOptional } from 'class-validator';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { BaseCommand, EnvironmentWithUserCommand } from '../../commands';

export class GetFeatureFlagCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;
}

export class FeatureFlagCommand extends BaseCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsDefined()
  contextKey: 'environment' | 'organization' | 'user';

  @IsDefined()
  contextId: string;
}

export class GetFeatureFlagNumberCommand extends FeatureFlagCommand {
  @IsOptional()
  context?: {
    organizationCreatedAt?: string;
  };

  @IsOptional()
  @IsNumber()
  defaultValue?: number;
}
