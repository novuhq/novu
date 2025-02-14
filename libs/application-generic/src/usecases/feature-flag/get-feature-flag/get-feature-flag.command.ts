import { IsDefined, IsOptional } from 'class-validator';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
import { BaseCommand } from '../../../commands';

export class GetFeatureFlagCommand extends BaseCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsOptional()
  user?: UserEntity;

  @IsOptional()
  organization?: OrganizationEntity;

  @IsOptional()
  environment?: EnvironmentEntity;
}

export class GetFeatureFlagNumberCommand extends BaseCommand {
  @IsDefined()
  key: FeatureFlagsKeysEnum;

  @IsOptional()
  defaultValue?: number;

  /*
   * If the Launch Darkly flag value matches the fallbackToDefault number, return defaultValue instead.
   * This allows configuring different fallback behaviors per feature flag by setting distinct fallbackToDefault values.
   */
  fallbackToDefault?: number;

  @IsOptional()
  user?: UserEntity;

  @IsOptional()
  organization?: OrganizationEntity;

  @IsOptional()
  environment?: EnvironmentEntity;
}
