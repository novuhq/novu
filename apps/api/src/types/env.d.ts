import type { ApiRateLimitEnvVarFormat } from '@novu/shared';

/*
 * The rate-limit usecases read the API_RATE_LIMIT_* family from `process.env` by computed name.
 * Every other variable is read through `env` from config/env.ts.
 */
type ApiRateLimitEnvVars = Record<ApiRateLimitEnvVarFormat, `${number}`>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends ApiRateLimitEnvVars {}
  }
}
