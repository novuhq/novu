import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import {
  GetFeatureFlagCommand,
  GetGlobalFeatureFlagCommand,
  FeatureFlagCommand,
} from './get-feature-flag.command';
import { GetFeatureFlag } from './get-feature-flag.use-case';

@Injectable()
export class GetIsTopicNotificationEnabled extends GetFeatureFlag {
  async execute(featureFlagCommand: FeatureFlagCommand): Promise<boolean> {
    const value = process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED;
    const fallbackValue = true; // It is a permanent feature now
    const defaultValue = this.prepareBooleanStringFeatureFlag(
      value,
      fallbackValue
    );
    const key = FeatureFlagsKeysEnum.IS_TOPIC_NOTIFICATION_ENABLED;

    const command = this.buildCommand(key, defaultValue, featureFlagCommand);

    return await this.featureFlagsService.getWithContext(command);
  }
}
