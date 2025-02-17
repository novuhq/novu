import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagsKeysEnum, FlagType } from '@novu/shared';
import { LaunchDarklyFeatureFlagsService } from './launch-darkly.service';
import { ProcessEnvFeatureFlagsService } from './process-env.service';

import { IFeatureFlagsService, IFeatureFlagContext } from './types';

const LOG_CONTEXT = 'FeatureFlagsService';

@Injectable()
export class FeatureFlagsService {
  public service: IFeatureFlagsService;

  public async initialize(): Promise<void> {
    const Service = process.env.LAUNCH_DARKLY_SDK_KEY ? LaunchDarklyFeatureFlagsService : ProcessEnvFeatureFlagsService;

    this.service = new Service();

    try {
      await this.service.initialize();
      Logger.log(`Feature Flags service (${Service.name}) has been successfully initialized.`, LOG_CONTEXT);
    } catch (error) {
      Logger.error(
        `Feature Flags service (${Service.name}) failed to initialize.`,
        (error as Error).stack || (error as Error).message,
        LOG_CONTEXT
      );
    }
  }

  public async gracefullyShutdown(): Promise<void> {
    try {
      await this.service.gracefullyShutdown();
      Logger.verbose('Feature Flags service has been gracefully shut down', LOG_CONTEXT);
    } catch (error) {
      Logger.error(error, 'Feature Flags service has failed when shut down', LOG_CONTEXT);
    }
  }

  public async getFlag<T extends FeatureFlagsKeysEnum>(context: IFeatureFlagContext<T>) {
    const { key } = context;

    if (key.endsWith('_ENABLED') || key.endsWith('_DISABLED')) {
      return this.service.getBooleanFlag<T>(context) as Promise<FlagType<T>>;
    }

    if (key.endsWith('_NUMBER')) {
      return this.service.getNumberFlag<T>(context) as Promise<FlagType<T>>;
    }

    throw new Error('Invalid feature flag key format');
  }
}
