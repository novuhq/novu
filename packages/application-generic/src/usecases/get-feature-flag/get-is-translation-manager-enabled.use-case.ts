import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import {
  GetFeatureFlagCommand,
  FeatureFlagCommand,
} from './get-feature-flag.command';
import { GetFeatureFlag } from './get-feature-flag.use-case';

@Injectable()
export class GetIsTranslationManagerEnabled extends GetFeatureFlag {
  async execute(featureFlagCommand: FeatureFlagCommand): Promise<boolean> {
    const value = process.env.IS_TRANSLATION_MANAGER_ENABLED;
    const fallbackValue = false;
    const defaultValue = this.prepareBooleanStringFeatureFlag(
      value,
      fallbackValue
    );
    const key = FeatureFlagsKeysEnum.IS_TRANSLATION_MANAGER_ENABLED;

    const command = this.buildCommand(key, defaultValue, featureFlagCommand);

    return await this.featureFlagsService.getWithContext(command);
  }
}
