import type { FeatureFlagsKeysEnum, ApiRateLimitEnvVarFormat } from '@novu/shared';
import type { ValidatedEnv } from '../config';

type ApiRateLimitEnvVars = Record<ApiRateLimitEnvVarFormat, `${number}`>;

type TypedEnvVars = ValidatedEnv & ApiRateLimitEnvVars;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends TypedEnvVars {
      NODE_ENV: 'test' | 'production' | 'dev' | 'ci' | 'local';
    }
  }
}
