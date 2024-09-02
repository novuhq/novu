import { Injectable } from '@nestjs/common';

import { prepareBooleanStringFeatureFlag } from '@novu/shared';
import { GetFeatureFlagCommand } from './get-feature-flag.command';
import { FeatureFlagsService } from '../../services';

@Injectable()
export class GetFeatureFlag {
  constructor(protected featureFlagsService: FeatureFlagsService) {}

  async execute(command: GetFeatureFlagCommand): Promise<boolean> {
    const value = process.env[command.key];
    const defaultValue = prepareBooleanStringFeatureFlag(value, false);

    return await this.featureFlagsService.getWithContext({
      ...command,
      defaultValue,
    });
  }
}
