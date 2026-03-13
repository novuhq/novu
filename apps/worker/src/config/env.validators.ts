import { DEFAULT_NOTIFICATION_RETENTION_DAYS, FeatureFlagsKeysEnum, StringifyEnv } from '@novu/shared';
import { bool, CleanedEnv, cleanEnv, json, makeValidator, num, port, str, url, ValidatorSpec } from 'envalid';

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;
const processEnv = process.env as Record<string, string>; // Hold the initial process.env to avoid circular reference

const str32 = makeValidator((variable) => {
  if (!(typeof variable === 'string') || variable.length !== 32) {
    throw new Error('Expected to be string 32 char long');
  }

  return variable;
});

function getFeatureFlagValidator(
  key: FeatureFlagsKeysEnum
): ValidatorSpec<string | number | boolean | undefined> {
  if (key.endsWith('_NUMBER') || key === FeatureFlagsKeysEnum.MAX_ENVIRONMENT_COUNT) {
    return num({ default: undefined });
  }

  if (key.startsWith('IS_')) {
    return bool({ default: false });
  }

  return str({ default: undefined });
}

/**
 * Declare your ENV variables here.
 *
 * Add a new validator to this list when you have a new ENV variable.
 */

export const envValidators = {
  TZ: str({ default: 'UTC' }),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'], default: 'local' }),
  PORT: port(),
  STORE_ENCRYPTION_KEY: str32(),
  STORE_NOTIFICATION_CONTENT: bool({ default: false }),
  ENABLE_OTEL: bool({ default: false }),
  ENABLE_OTEL_LOGS: bool({ default: false }),
  OTEL_PROMETHEUS_PORT: num({ default: 9464 }),
  MAX_NOVU_INTEGRATION_MAIL_REQUESTS: num({ default: 300 }),
  NOVU_EMAIL_INTEGRATION_API_KEY: str({ default: '' }),
  STORAGE_SERVICE: str({ default: undefined }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_PASSWORD: str({ default: undefined }),
  REDIS_TLS: json({ default: undefined }),
  REDIS_DB_INDEX: num(),
  REDIS_CACHE_SERVICE_HOST: str({ default: undefined }),
  REDIS_CACHE_SERVICE_PORT: str({ default: undefined }),
  REDIS_CACHE_TTL: str({ default: undefined }),
  REDIS_CACHE_PASSWORD: str({ default: undefined }),
  REDIS_CACHE_CONNECTION_TIMEOUT: str({ default: undefined }),
  REDIS_CACHE_KEEP_ALIVE: str({ default: undefined }),
  REDIS_CACHE_FAMILY: str({ default: undefined }),
  REDIS_CACHE_KEY_PREFIX: str({ default: undefined }),
  REDIS_MASTER_HOST: str({ default: '' }),
  REDIS_MASTER_PORT: str({ default: '' }),
  REDIS_SLAVE_HOST: str({ default: '' }),
  REDIS_SLAVE_PORT: str({ default: '' }),
  MONGO_AUTO_CREATE_INDEXES: bool({ default: false }),
  MONGO_MAX_IDLE_TIME_IN_MS: num({ default: 1000 * 30 }),
  MONGO_MAX_POOL_SIZE: num({ default: 50 }),
  MONGO_MIN_POOL_SIZE: num({ default: 10 }),
  MONGO_URL: str(),
  SEGMENT_TOKEN: str({ default: undefined }),
  LAUNCH_DARKLY_SDK_KEY: str({ default: undefined }),
  STRIPE_API_KEY: str({ default: undefined }),
  NOTIFICATION_RETENTION_DAYS: num({ default: DEFAULT_NOTIFICATION_RETENTION_DAYS }),
  API_ROOT_URL: url(),
  SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME: str({ default: '15 days' }),
  WORKER_DEFAULT_CONCURRENCY: num({ default: undefined }),
  WORKER_DEFAULT_LOCK_DURATION: num({ default: undefined }),
  SUBSCRIBER_PROCESS_WORKER_CONCURRENCY: num({ default: undefined }),
  STANDARD_WORKER_CONCURRENCY: num({ default: undefined }),
  WORKFLOW_WORKER_CONCURRENCY: num({ default: undefined }),
  SQS_DEFAULT_CONCURRENCY: num({ default: undefined }),
  SQS_DEFAULT_VISIBILITY_TIMEOUT: num({ default: undefined }),
  SQS_DEFAULT_BATCH_SIZE: num({ default: undefined }),
  SQS_DEFAULT_WAIT_TIME_SECONDS: num({ default: undefined }),
  SOCKET_WORKER_URL: str({ default: undefined }),
  INTERNAL_SERVICES_API_KEY: str({ default: undefined }),
  SCHEDULER_URL: str({ default: undefined }),
  SCHEDULER_API_KEY: str({ default: undefined }),
  STEP_RESOLVER_DISPATCH_URL: str({ default: undefined }),
  STEP_RESOLVER_HMAC_SECRET: str({ default: '' }),
  // Feature Flags
  ...(Object.fromEntries(
    Object.values(FeatureFlagsKeysEnum).map((key) => [key, getFeatureFlagValidator(key)])
  ) as Record<FeatureFlagsKeysEnum, ValidatorSpec<string | number | boolean | undefined>>),

  // Azure validators
  ...(processEnv.STORAGE_SERVICE === 'AZURE' && {
    AZURE_ACCOUNT_NAME: str(),
    AZURE_ACCOUNT_KEY: str(),
    AZURE_HOST_NAME: str({ default: `https://${processEnv.AZURE_ACCOUNT_NAME}.blob.core.windows.net` }),
    AZURE_CONTAINER_NAME: str({ default: 'novu' }),
  }),

  // GCS validators
  ...(processEnv.STORAGE_SERVICE === 'GCS' && {
    GCS_BUCKET_NAME: str(),
    GCS_DOMAIN: str(),
  }),

  // AWS validators
  ...(processEnv.STORAGE_SERVICE === 'AWS' && {
    S3_LOCAL_STACK: str({ default: '' }),
    S3_BUCKET_NAME: str(),
    S3_REGION: str(),
  }),

  // Production validators
  ...(['local', 'test'].includes(processEnv.NODE_ENV) && {
    NEW_RELIC_APP_NAME: str({ default: '' }),
    NEW_RELIC_LICENSE_KEY: str({ default: '' }),
    REDIS_CACHE_SERVICE_HOST: str(),
    REDIS_CACHE_SERVICE_PORT: str(),
    REDIS_CACHE_PASSWORD: str(),
  }),
} satisfies Record<string, ValidatorSpec<unknown>>;
