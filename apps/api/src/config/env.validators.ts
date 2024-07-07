import { json, makeValidator, port, str, num, url, ValidatorSpec, bool } from 'envalid';
import {
  DEFAULT_MESSAGE_GENERIC_RETENTION_DAYS,
  DEFAULT_MESSAGE_IN_APP_RETENTION_DAYS,
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
} from '@novu/shared';

const str32 = makeValidator((variable) => {
  if (!(typeof variable === 'string') || variable.length != 32) {
    throw new Error('Expected to be string 32 char long');
  }

  return variable;
});

export const envValidators = {
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'], default: 'local' }),
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
  STORE_ENCRYPTION_KEY: str32(),
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

  // Azure validators
  ...(process.env.STORAGE_SERVICE === 'AZURE' && {
    AZURE_ACCOUNT_NAME: str(),
    AZURE_ACCOUNT_KEY: str(),
    AZURE_HOST_NAME: str({ default: `https://${process.env.AZURE_ACCOUNT_NAME}.blob.core.windows.net` }),
    AZURE_CONTAINER_NAME: str({ default: 'novu' }),
  }),

  // GCS validators
  ...(process.env.STORAGE_SERVICE === 'GCS' && {
    GCS_BUCKET_NAME: str(),
    GCS_DOMAIN: str(),
  }),

  // AWS validators
  ...(process.env.STORAGE_SERVICE === 'AWS' && {
    S3_LOCAL_STACK: str({ default: '' }),
    S3_BUCKET_NAME: str(),
    S3_REGION: str(),
    AWS_ACCESS_KEY_ID: str(),
    AWS_SECRET_ACCESS_KEY: str(),
  }),

  // Production validators
  ...(['local', 'test'].includes(process.env.NODE_ENV) && {
    SENTRY_DSN: str({ default: '' }),
    VERCEL_CLIENT_ID: str({ default: '' }),
    VERCEL_CLIENT_SECRET: str({ default: '' }),
    VERCEL_REDIRECT_URI: url({ default: 'https://dashboard.novu.co/auth/login' }),
    VERCEL_BASE_URL: url({ default: 'https://api.vercel.com' }),
  }),
} satisfies Record<string, ValidatorSpec<unknown>>;
