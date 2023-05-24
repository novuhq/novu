import { Injectable, Logger } from '@nestjs/common';

import { GetFeatureFlagCommand } from './get-feature-flag.command';

import { FeatureFlagsService } from '../../services';

@Injectable()
export class GetFeatureFlag {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  async execute(command: GetFeatureFlagCommand): Promise<void> {
    const { key, environmentId, organizationId, userId } = command;

    const context = {
      environmentId,
      organizationId,
      userId,
    };

    // TODO: The type needs to be dynamic. String so far by default
    await this.featureFlagsService.get(key, context, '');
  }
}
