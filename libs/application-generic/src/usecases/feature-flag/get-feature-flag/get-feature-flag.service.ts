import { Injectable } from '@nestjs/common';

import {
  prepareBooleanStringFeatureFlag,
  prepareNumberStringFeatureFlag,
} from '@novu/shared';
import {
  GetFeatureFlagCommand,
  GetFeatureFlagNumberCommand,
} from './get-feature-flag.command';
import { FeatureFlagsService } from '../../../services';

@Injectable()
export class GetFeatureFlagService {
  constructor(protected featureFlagsService: FeatureFlagsService) {}

  async getBoolean(command: GetFeatureFlagCommand): Promise<boolean> {
    const value = process.env[command.key];
    const defaultValue = prepareBooleanStringFeatureFlag(value, false);

    return await this.featureFlagsService.getFlag({
      ...command,
      defaultValue,
    });
  }

  async getNumber(command: GetFeatureFlagNumberCommand): Promise<number> {
    const value = process.env[command.key];
    let parsedDefaultValue = command.defaultValue;
    parsedDefaultValue = prepareNumberStringFeatureFlag(
      value,
      command.defaultValue || 0,
    );

    const result = await this.featureFlagsService.getFlag({
      ...command,
      defaultValue: parsedDefaultValue,
    });

    if (result === command.fallbackToDefault) {
      return command.defaultValue;
    }

    return result;
  }
}
