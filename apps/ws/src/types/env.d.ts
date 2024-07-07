import type { FeatureFlagsKeysEnum, ApiRateLimitEnvVarFormat } from '@novu/shared';
import type { ValidatedEnv } from '../config/env.config';

declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface ProcessEnv extends ValidatedEnv {
      NODE_ENV: 'test' | 'production' | 'dev' | 'ci' | 'local';
    }
  }
}
