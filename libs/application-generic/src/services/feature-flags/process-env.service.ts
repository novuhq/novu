import { Injectable } from '@nestjs/common';
import type { FeatureFlagContext, IFeatureFlagsService } from './types';

@Injectable()
export class ProcessEnvFeatureFlagsService implements IFeatureFlagsService {
  public isEnabled: boolean = true;

  async initialize() {
    this.isEnabled = true;
  }
  async gracefullyShutdown() {
    this.isEnabled = false;
  }

  async getFlag<T_Result>(context: FeatureFlagContext<T_Result>): Promise<T_Result> {
    const processEnvValue = process.env[context.key];
    if (!processEnvValue) {
      return context.defaultValue as T_Result;
    }

    if (typeof context.defaultValue === 'number') {
      return Number(processEnvValue) as T_Result;
    }

    if (typeof context.defaultValue === 'boolean') {
      return (processEnvValue === 'true') as T_Result;
    }

    if (typeof context.defaultValue === 'string') {
      return processEnvValue as T_Result;
    }

    return context.defaultValue as T_Result;
  }
}
