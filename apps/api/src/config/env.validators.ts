import { bool, CleanedEnv, cleanEnv, json, num, port, str, url, ValidatorSpec } from 'envalid';
import {
  DEFAULT_MESSAGE_GENERIC_RETENTION_DAYS,
  DEFAULT_MESSAGE_IN_APP_RETENTION_DAYS,
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  FeatureFlagsKeysEnum,
  StringifyEnv,
} from '@novu/shared';

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;
const processEnv = process.env as Record<string, string>; // Hold the initial process.env to avoid circular reference

export const envValidators = {
  TZ: str({ default: 'UTC' }),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local'], default: 'local' }),
  PORT: port(),
  FRONT_BASE_URL: url(),
  DISABLE_USER_REGISTRATION: bool({ default: false }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_TLS: json({ default: undefined }),
  JWT_SECRET: str(),
  SENDGRID_API_KEY: str({ default: '' }),
  MONGO_URL: str(),
  MONGO_MIN_POOL_SIZE: num({ default: 10 }),
  MONGO_MAX_POOL_SIZE: num({ default: 500 }),
  NOVU_API_KEY: str({ default: '' }),
  STORE_ENCRYPTION_KEY: str(),
  NEW_RELIC_APP_NAME: str({ default: '' }),
  NEW_RELIC_LICENSE_KEY: str({ default: '' }),
  REDIS_CACHE_SERVICE_HOST: str({ default: '' }),
  REDIS_CACHE_SERVICE_PORT: str({ default: '' }),
  REDIS_CACHE_SERVICE_TLS: json({ default: undefined }),
  REDIS_CLUSTER_SERVICE_HOST: str({ default: '' }),
  REDIS_CLUSTER_SERVICE_PORTS: str({ default: '' }),
  STORE_NOTIFICATION_CONTENT: bool({ default: false }),
  LAUNCH_DARKLY_SDK_KEY: str({ default: '' }),
  WORKER_DEFAULT_CONCURRENCY: num({ default: undefined }),
  WORKER_DEFAULT_LOCK_DURATION: num({ default: undefined }),
  STRIPE_API_KEY: str({ default: undefined }),
  STRIPE_CONNECT_SECRET: str({ default: undefined }),
  ENABLE_OTEL: bool({ default: false }),
  NOTIFICATION_RETENTION_DAYS: num({ default: DEFAULT_NOTIFICATION_RETENTION_DAYS }),
  MESSAGE_GENERIC_RETENTION_DAYS: num({ default: DEFAULT_MESSAGE_GENERIC_RETENTION_DAYS }),
  MESSAGE_IN_APP_RETENTION_DAYS: num({ default: DEFAULT_MESSAGE_IN_APP_RETENTION_DAYS }),
  LEGACY_STAGING_DASHBOARD_URL: url({ default: undefined }),
  API_ROOT_URL: url(),
  NOVU_INVITE_TEAM_MEMBER_NUDGE_TRIGGER_IDENTIFIER: str({ default: undefined }),
  HUBSPOT_INVITE_NUDGE_EMAIL_USER_LIST_ID: str({ default: undefined }),
  HUBSPOT_PRIVATE_APP_ACCESS_TOKEN: str({ default: undefined }),
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
    SENTRY_DSN: str({ default: '' }),
    VERCEL_CLIENT_ID: str({ default: '' }),
    VERCEL_CLIENT_SECRET: str({ default: '' }),
    VERCEL_REDIRECT_URI: url({ default: 'https://dashboard.novu.co/auth/login' }),
    VERCEL_BASE_URL: url({ default: 'https://api.vercel.com' }),
  }),
} satisfies Record<string, ValidatorSpec<unknown>>;
