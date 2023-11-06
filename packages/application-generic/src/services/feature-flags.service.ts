import { Injectable, Logger } from '@nestjs/common';

import { LaunchDarklyService } from './launch-darkly.service';

import {
  FeatureFlagsKeysEnum,
  IFeatureFlagContext,
  IFeatureFlagsService,
  IContextualFeatureFlag,
  IGlobalFeatureFlag,
} from './types';

const LOG_CONTEXT = 'FeatureFlagsService';

export enum FeatureFlagsProvidersEnum {
  LAUNCH_DARKLY = 'LaunchDarkly',
}

const featureFlagsProviders = {
  [FeatureFlagsProvidersEnum.LAUNCH_DARKLY]: LaunchDarklyService,
};

@Injectable()
export class FeatureFlagsService {
  public service: IFeatureFlagsService;

  public async initialize(): Promise<void> {
    Logger.verbose('Feature Flags service initialized', LOG_CONTEXT);

    // TODO: In the future we can replace the object key here for an environment variable
    const service =
      featureFlagsProviders[FeatureFlagsProvidersEnum.LAUNCH_DARKLY];

    if (service) {
      this.service = new service();

      try {
        await this.service.initialize();
        Logger.log(
          'Feature Flags service has been successfully initialized',
          LOG_CONTEXT
        );
      } catch (error) {
        Logger.error(
          'Feature Flags service has failed when initialized',
          error,
          LOG_CONTEXT
        );
      }
    } else {
      Logger.error('No Feature Flags service available to initialize');
    }
  }

  public async gracefullyShutdown(): Promise<void> {
    if (this.isServiceEnabled()) {
      try {
        await this.service.gracefullyShutdown();
        Logger.log(
          'Feature Flags service has been gracefully shut down',
          LOG_CONTEXT
        );
      } catch (error) {
        Logger.error(
          error,
          'Feature Flags service has failed when shut down',
          LOG_CONTEXT
        );
      }
    }
  }

  public async getWithContext<T>(
    contextualFeatureFlag: IContextualFeatureFlag<T>
  ): Promise<T> {
    const { defaultValue, key, environmentId, organizationId, userId } =
      contextualFeatureFlag;

    const context = {
      environmentId,
      organizationId,
      userId,
    };

    return await this.get(key, defaultValue, context);
  }

  /**
   * When we want to retrieve a global feature flag that shouldn't be dependant on any context
   * we will use this functionality. Helpful for setting feature flags that discriminate
   * the Novu Cloud service offerings with the self hosted users.
   */
  public async getGlobal<T>(
    globalFeatureFlag: IGlobalFeatureFlag<T>
  ): Promise<T> {
    const { defaultValue, key } = globalFeatureFlag;

    if (!this.isServiceEnabled()) {
      return defaultValue;
    }

    return (await this.service.getWithAnonymousContext(
      key,
      defaultValue
    )) satisfies T;
  }

  /**
   *  Feature Flags precedence will be this way:
   *  - Feature Flag service defined value
   *  - Feature Flag service cache stored value
   *  - Default value with the value provided by Novu's environment variable if set
   *  - Default value with the value provided by the hardcoded fallback
   */
  public async get<T>(
    key: FeatureFlagsKeysEnum,
    defaultValue: T,
    context: IFeatureFlagContext
  ): Promise<T> {
    if (!this.isServiceEnabled()) {
      return defaultValue;
    }

    // TODO: Select here which context we will need in the future
    return (await this.service.getWithUserContext(
      key,
      defaultValue,
      context.userId
    )) satisfies T;
  }

  private isServiceEnabled(): boolean {
    return this.service && this.service.isEnabled;
  }
}
