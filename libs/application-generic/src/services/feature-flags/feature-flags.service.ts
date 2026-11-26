import { Injectable, Logger } from '@nestjs/common';
import { parseFeatureFlagOverrides } from '@novu/shared';
import { LaunchDarklyFeatureFlagsService } from './launch-darkly.service';
import { ProcessEnvFeatureFlagsService } from './process-env.service';

import { FeatureFlagContext, IFeatureFlagsService } from './types';

const LOG_CONTEXT = 'FeatureFlagsService';

@Injectable()
export class FeatureFlagsService {
  public service: IFeatureFlagsService;

  private readonly overrides = parseFeatureFlagOverrides(process.env.FEATURE_FLAG_OVERRIDES);

  public async initialize(): Promise<void> {
    if (Object.keys(this.overrides).length) {
      Logger.warn(`Feature flags forced by FEATURE_FLAG_OVERRIDES: ${JSON.stringify(this.overrides)}`, LOG_CONTEXT);
    }

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
  // the T_Result is inferred from the usage within the context.defaultValue in FeatureFlagContext
  public async getFlag<T_Result>(context: FeatureFlagContext<T_Result>): Promise<T_Result> {
    if (Object.hasOwn(this.overrides, context.key)) {
      return this.overrides[context.key] as T_Result;
    }

    return this.service.getFlag(context);
  }
}
