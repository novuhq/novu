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
    return context.defaultValue;
  }
}
