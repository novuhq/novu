import { init, LDClient } from 'launchdarkly-node-server-sdk';
import { Injectable, Logger } from '@nestjs/common';

import { IFeatureFlagsService } from '../types';

const LOG_CONTEXT = 'LaunchDarklyService';

@Injectable()
export class LaunchDarklyService implements IFeatureFlagsService {
  private client: LDClient;

  constructor() {
    const launchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;

    if (launchDarklySdkKey) {
      this.client = init(launchDarklySdkKey);
    }
  }

  public async initialize(): Promise<void> {
    try {
      await this.client.waitForInitialization();
      Logger.log('Launch Darkly SDK has been successfully initialized', LOG_CONTEXT);
    } catch (error) {
      Logger.error('Launch Darkly SDK has failed when initialized', LOG_CONTEXT, error);
      throw error;
    }
  }

  public async gracefullyShutdown(): Promise<void> {
    if (this.client) {
      try {
        await this.client.flush();
        await this.client.close();
        Logger.log('Launch Darkly SDK has been gracefully shutted down', LOG_CONTEXT);
      } catch (error) {
        Logger.error('Launch Darkly SDK has failed when shutted down', LOG_CONTEXT, error);
        throw error;
      }
    }
  }
}
