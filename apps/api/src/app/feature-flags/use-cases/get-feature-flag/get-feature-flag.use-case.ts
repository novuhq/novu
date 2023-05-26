import { Injectable, Logger } from '@nestjs/common';

import { GetFeatureFlagCommand } from './get-feature-flag.command';

import { FeatureFlagsService } from '../../services';

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
}
