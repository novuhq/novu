import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import type { IFeatureFlagContext, IFeatureFlagsService } from './types';

@Injectable()
export class ProcessEnvFeatureFlagsService implements IFeatureFlagsService {
  public isEnabled: boolean = true;

  async initialize() {
    this.isEnabled = true;
  }
  async gracefullyShutdown() {
    this.isEnabled = false;
  }

  async getBooleanFlag<T extends FeatureFlagsKeysEnum>({
    key,
    defaultValue,
  }: IFeatureFlagContext<T>): Promise<boolean> {
    return process.env[key] === 'true' || (defaultValue as boolean);
  }

  async getNumberFlag<T extends FeatureFlagsKeysEnum>({ key, defaultValue }: IFeatureFlagContext<T>): Promise<number> {
    return Number(process.env[key]) || (defaultValue as number);
  }
}
