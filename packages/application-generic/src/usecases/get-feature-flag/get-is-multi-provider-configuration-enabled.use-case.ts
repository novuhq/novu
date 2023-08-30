import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import {
  GetFeatureFlagCommand,
  FeatureFlagCommand,
} from './get-feature-flag.command';
import { GetFeatureFlag } from './get-feature-flag.use-case';

const LOG_CONTEXT = 'GetIsMultiProviderConfigurationEnabled';

@Injectable()
export class GetIsMultiProviderConfigurationEnabled extends GetFeatureFlag {
  async execute(featureFlagCommand: FeatureFlagCommand): Promise<boolean> {
    const value = process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
    const fallbackValue = false;
    const defaultValue = this.prepareBooleanStringFeatureFlag(
      value,
      fallbackValue
    );
    const key = FeatureFlagsKeysEnum.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;

    const command = this.buildCommand(key, defaultValue, featureFlagCommand);

    return await this.featureFlagsService.getWithContext(command);
  }
}
