import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import {
  GetFeatureFlagCommand,
  GetGlobalFeatureFlagCommand,
  FeatureFlagCommand,
} from './get-feature-flag.command';
import { FeatureFlagsService } from '../../services';

@Injectable()
export class GetFeatureFlag {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  async getWithContext<T>(command: GetFeatureFlagCommand<T>): Promise<T> {
    const { defaultValue, key, environmentId, organizationId, userId } =
      command;

    const context = {
      environmentId,
      organizationId,
      userId,
    };

    return await this.featureFlagsService.get(key, defaultValue, context);
  }

  async getGlobal<T>(command: GetGlobalFeatureFlagCommand<T>): Promise<T> {
    const { defaultValue, key } = command;

    return await this.featureFlagsService.getGlobal<T>(key, defaultValue);
  }

  async isInMemoryClusterModeEnabled(): Promise<boolean> {
    const value = process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED;
    const fallbackValue = false;
    const defaultValue = this.prepareBooleanStringFeatureFlag(
      value,
      fallbackValue
    );
    const key = FeatureFlagsKeysEnum.IS_IN_MEMORY_CLUSTER_MODE_ENABLED;

    const command = this.buildCommand(key, defaultValue);

    return await this.getGlobal(command);
  }

  async isTemplateStoreEnabled(
    featureFlagCommand: FeatureFlagCommand
  ): Promise<boolean> {
    const value = process.env.IS_TEMPLATE_STORE_ENABLED;
    const fallbackValue = false;
    const defaultValue = this.prepareBooleanStringFeatureFlag(
      value,
      fallbackValue
    );
    const key = FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED;

    const command = this.buildCommand(key, defaultValue, featureFlagCommand);

    return await this.getWithContext(command);
  }

  async isMultiProviderConfigurationEnabled(
    featureFlagCommand: FeatureFlagCommand
  ): Promise<boolean> {
    const value = process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
    const fallbackValue = false;
    const defaultValue = this.prepareBooleanStringFeatureFlag(
      value,
      fallbackValue
    );
    const key = FeatureFlagsKeysEnum.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;

    const command = this.buildCommand(key, defaultValue, featureFlagCommand);

    return await this.getWithContext(command);
  }

  async isTopicNotificationEnabled(
    featureFlagCommand: FeatureFlagCommand
  ): Promise<boolean> {
    const value = process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED;
    const fallbackValue = true; // It is a permanent feature now
    const defaultValue = this.prepareBooleanStringFeatureFlag(
      value,
      fallbackValue
    );
    const key = FeatureFlagsKeysEnum.IS_TOPIC_NOTIFICATION_ENABLED;

    const command = this.buildCommand(key, defaultValue, featureFlagCommand);

    return await this.getWithContext(command);
  }

  private buildCommand<T>(
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

  private prepareBooleanStringFeatureFlag(
    value: string | undefined,
    defaultValue: boolean
  ): boolean {
    if (!value) {
      return defaultValue;
    }

    return value === 'true';
  }
}
