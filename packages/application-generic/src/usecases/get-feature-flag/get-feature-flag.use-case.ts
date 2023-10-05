import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import {
  GetFeatureFlagCommand,
  FeatureFlagCommand,
} from './get-feature-flag.command';
import { FeatureFlagsService } from '../../services';

@Injectable()
export class GetFeatureFlag {
  constructor(protected featureFlagsService: FeatureFlagsService) {}

  protected buildCommand<T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    command?: FeatureFlagCommand
  ): GetFeatureFlagCommand<T> {
    return {
      ...command,
      defaultValue,
      key,
    };
  }

  protected prepareBooleanStringFeatureFlag(
    value: string | undefined,
    defaultValue: boolean
  ): boolean {
    if (!value) {
      return defaultValue;
    }

    return value === 'true';
  }
}
