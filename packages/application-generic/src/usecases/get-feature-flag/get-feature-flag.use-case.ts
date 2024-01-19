import { Injectable } from '@nestjs/common';

import { GetFeatureFlagCommand } from './get-feature-flag.command';
import { FeatureFlagsService } from '../../services';

@Injectable()
export class GetFeatureFlag {
  constructor(protected featureFlagsService: FeatureFlagsService) {}

  async execute(command: GetFeatureFlagCommand): Promise<boolean> {
    const value = process.env[command.key];
    const defaultValue = this.prepareBooleanStringFeatureFlag(value, false);

    return await this.featureFlagsService.getWithContext({
      ...command,
      defaultValue,
    });
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
