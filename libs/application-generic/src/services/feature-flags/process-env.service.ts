import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import type { IFeatureFlagContext, IFeatureFlagsService } from './types';

@Injectable()
export class ProcessEnvFeatureFlagsService implements IFeatureFlagsService {
  initialize: () => Promise<void>;
  gracefullyShutdown: () => Promise<void>;

  public isEnabled: boolean = true;

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
