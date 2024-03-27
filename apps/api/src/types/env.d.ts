import type { FeatureFlagsKeysEnum, ApiRateLimitEnvVarFormat } from '@novu/shared';

type FeatureFlagsEnvVars = Record<FeatureFlagsKeysEnum, `${boolean}`>;
type ApiRateLimitEnvVars = Record<ApiRateLimitEnvVarFormat, `${number}`>;

type TypedEnvVars = FeatureFlagsEnvVars & ApiRateLimitEnvVars;

declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface ProcessEnv extends TypedEnvVars {
      MONGO_URL: string;
      MONGO_MIN_POOL_SIZE: `${number}`;
      MONGO_MAX_POOL_SIZE: `${number}`;
      REDIS_URL: string;
      SYNC_PATH: string;
      GOOGLE_OAUTH_CLIENT_SECRET: string;
      GOOGLE_OAUTH_CLIENT_ID: string;
      NODE_ENV: 'test' | 'production' | 'dev' | 'ci' | 'local';
      PORT: `${number}`;
      DISABLE_USER_REGISTRATION: `${boolean}`;
      IS_API_IDEMPOTENCY_ENABLED: `${boolean}`;
      FRONT_BASE_URL: string;
      API_ROOT_URL: string;
      SENTRY_DSN: string;
      STRIPE_API_KEY: string;
      STRIPE_CONNECT_SECRET: string;
      NOTIFICATION_RETENTION_DAYS?: number;
      MESSAGE_GENERIC_RETENTION_DAYS?: number;
      MESSAGE_IN_APP_RETENTION_DAYS?: number;
    }
  }
}
