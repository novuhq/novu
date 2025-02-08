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
  /** @deprecated - use `MONGO_AUTO_CREATE_INDEXES` instead */
  AUTO_CREATE_INDEXES: bool({ default: false }),
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
  // Feature Flags
  ...Object.keys(FeatureFlagsKeysEnum).reduce(
    (acc, key) => {
      return {
        ...acc,
        [key as FeatureFlagsKeysEnum]: bool({ default: false }),
      };
    },
    {} as Record<FeatureFlagsKeysEnum, ValidatorSpec<boolean>>
  ),

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
    AWS_ACCESS_KEY_ID: str(),
    AWS_SECRET_ACCESS_KEY: str(),
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
