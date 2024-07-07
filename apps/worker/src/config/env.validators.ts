import { json, port, str, num, ValidatorSpec, makeValidator, bool } from 'envalid';
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

/**
 * Declare your ENV variables here.
 *
 * Add a new validator to this list when you have a new ENV variable.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const envValidators = {
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'], default: 'local' }),
  PORT: port(),
  STORE_ENCRYPTION_KEY: str32(),
  STORE_NOTIFICATION_CONTENT: bool({ default: false }),
  MAX_NOVU_INTEGRATION_MAIL_REQUESTS: num({ default: 300 }),
  MAX_NOVU_INTEGRATION_SMS_REQUESTS: num({ default: 20 }),
  STORAGE_SERVICE: str({ default: undefined }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_PASSWORD: str({ default: undefined }),
  REDIS_TLS: json({ default: undefined }),
  REDIS_DB_INDEX: num(),
  MONGO_URL: str(),
  MONGO_MIN_POOL_SIZE: num({ default: 10 }),
  MONGO_MAX_POOL_SIZE: num({ default: 500 }),
  SEGMENT_TOKEN: str({ default: undefined }),
  LAUNCH_DARKLY_SDK_KEY: str({ default: '' }),
  STRIPE_API_KEY: str({ default: undefined }),
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
    NEW_RELIC_APP_NAME: str({ default: '' }),
    NEW_RELIC_LICENSE_KEY: str({ default: '' }),
    REDIS_CACHE_SERVICE_HOST: str(),
    REDIS_CACHE_SERVICE_PORT: str(),
    REDIS_CACHE_PASSWORD: str(),
  }),
} satisfies Record<string, ValidatorSpec<unknown>>;
