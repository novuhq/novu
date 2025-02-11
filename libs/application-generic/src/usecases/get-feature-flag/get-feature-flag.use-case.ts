import { Injectable } from '@nestjs/common';

import {
  prepareBooleanStringFeatureFlag,
  prepareNumberStringFeatureFlag,
} from '@novu/shared';
import {
  GetFeatureFlagCommand,
  GetFeatureFlagNumberCommand,
} from './get-feature-flag.command';
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

  async getNumber(
    command: GetFeatureFlagNumberCommand,
  ): Promise<number | undefined> {
    const value = process.env[command.key];
    const defaultValue = prepareNumberStringFeatureFlag(
      value,
      command.defaultValue,
    );

    const result = await this.featureFlagsService.getWithFullContext({
      ...command,
      defaultValue,
    });

    return result === -1 ? command.defaultValue : result;
  }
}
