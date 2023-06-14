import { Injectable, Logger } from '@nestjs/common';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

import { GetFeatureFlagCommand, FeatureFlagCommand } from './get-feature-flag.command';

import { FeatureFlagsService } from '../../services';
import { FeatureFlagsKeysEnum } from '../../types';

@Injectable()
export class GetFeatureFlag {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  async execute<T>(command: GetFeatureFlagCommand<T>): Promise<T> {
    const { defaultValue, key, environmentId, organizationId, userId } = command;

    const context = {
      environmentId,
      organizationId,
      userId,
    };

    return await this.featureFlagsService.get(key, defaultValue, context);
  }

  async isTemplateStoreEnabled(featureFlagCommand: FeatureFlagCommand): Promise<boolean> {
    const value = process.env.IS_TEMPLATE_STORE_ENABLED;
    const fallbackValue = false;
    const defaultValue = this.prepareBooleanStringFeatureFlag(value, fallbackValue);
    const key = FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED;

    const command = this.buildCommand(featureFlagCommand, key, defaultValue);

    return await this.execute(command);
  }

  async isTopicNotificationEnabled(featureFlagCommand: FeatureFlagCommand): Promise<boolean> {
    const value = process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED;
    const fallbackValue = true; // It is a permanent feature now
    const defaultValue = this.prepareBooleanStringFeatureFlag(value, fallbackValue);
    const key = FeatureFlagsKeysEnum.IS_TOPIC_NOTIFICATION_ENABLED;

    const command = this.buildCommand(featureFlagCommand, key, defaultValue);

    return await this.execute(command);
  }

  private buildCommand<T>(
    command: FeatureFlagCommand,
    key: FeatureFlagsKeysEnum,
    defaultValue: T
  ): GetFeatureFlagCommand<T> {
    return {
      ...command,
      defaultValue,
      key,
    };
  }

  private prepareBooleanStringFeatureFlag(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) {
      return defaultValue;
    }

    return value === 'true';
  }
}
