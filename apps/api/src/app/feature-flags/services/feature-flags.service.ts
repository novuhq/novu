import { Injectable, Logger } from '@nestjs/common';

import { LaunchDarklyService } from './launch-darkly.service';

import { FeatureFlagsKeysEnum, IFeatureFlagContext, IFeatureFlagsService } from '../types';

const LOG_CONTEXT = 'FeatureFlagsService';

export enum FeatureFlagsProvidersEnum {
  LAUNCH_DARKLY = 'LaunchDarkly',
}

const featureFlagsProviders = {
  [FeatureFlagsProvidersEnum.LAUNCH_DARKLY]: LaunchDarklyService,
};

@Injectable()
export class FeatureFlagsService {
  private service: IFeatureFlagsService;

  constructor() {
    // TODO: In the future we can replace the object key here for an environment variable
    const service = featureFlagsProviders[FeatureFlagsProvidersEnum.LAUNCH_DARKLY];

    if (service) {
      this.service = new service();
    }
  }

  public async onModuleInit(): Promise<void> {
    if (this.service) {
      try {
        await this.service.initialize();
        Logger.log('Feature Flags service has been successfully initialized', LOG_CONTEXT);
      } catch (error) {
        Logger.error('Feature Flags service has failed when initialized', LOG_CONTEXT, error);
      }
    }
  }

  public async gracefullyShutdown(): Promise<void> {
    if (this.service) {
      try {
        await this.service.gracefullyShutdown();
        Logger.log('Feature Flags service has been gracefully shutted down', LOG_CONTEXT);
      } catch (error) {
        Logger.error('Feature Flags service has failed when shutted down', LOG_CONTEXT, error);
      }
    }
  }

  public async get<T>(key: FeatureFlagsKeysEnum, defaultValue: T, context: IFeatureFlagContext): Promise<T> {
    // TODO: Select here which context we will need in the future
    return (await this.service.getWithUserContext(key, defaultValue, context.userId)) satisfies T;
  }
}
