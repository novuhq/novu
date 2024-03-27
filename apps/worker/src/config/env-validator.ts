import { cleanEnv, json, port, str, num, ValidatorSpec, makeValidator } from 'envalid';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validators: { [K in keyof any]: ValidatorSpec<any[K]> } = {
  NODE_ENV: str({
    choices: ['dev', 'test', 'production', 'ci', 'local', 'staging'],
    default: 'local',
  }),
  PORT: port(),
  STORE_ENCRYPTION_KEY: str32(),
  STORE_NOTIFICATION_CONTENT: str({
    default: 'false',
  }),
  MAX_NOVU_INTEGRATION_MAIL_REQUESTS: num({
    default: 300,
  }),
  MAX_NOVU_INTEGRATION_SMS_REQUESTS: num({
    default: 20,
  }),
  STORAGE_SERVICE: str({
    default: undefined,
  }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_PASSWORD: str({
    default: undefined,
  }),
  REDIS_TLS: json({
    default: undefined,
  }),
  REDIS_DB_INDEX: num(),
  MONGO_URL: str(),
  MONGO_MIN_POOL_SIZE: num({
    default: 10,
  }),
  MONGO_MAX_POOL_SIZE: num({
    default: 500,
  }),
  SEGMENT_TOKEN: str({
    default: undefined,
  }),
  LAUNCH_DARKLY_SDK_KEY: str({
    default: '',
  }),
  STRIPE_API_KEY: str({
    default: undefined,
  }),
  NOTIFICATION_RETENTION_DAYS: num({
    default: DEFAULT_NOTIFICATION_RETENTION_DAYS,
  }),
  MESSAGE_GENERIC_RETENTION_DAYS: num({
    default: DEFAULT_MESSAGE_GENERIC_RETENTION_DAYS,
  }),
  MESSAGE_IN_APP_RETENTION_DAYS: num({
    default: DEFAULT_MESSAGE_IN_APP_RETENTION_DAYS,
  }),
};

if (process.env.STORAGE_SERVICE === 'AZURE') {
  validators.AZURE_ACCOUNT_NAME = str();
  validators.AZURE_ACCOUNT_KEY = str();
  validators.AZURE_HOST_NAME = str({
    default: `https://${process.env.AZURE_ACCOUNT_NAME}.blob.core.windows.net`,
  });
  validators.AZURE_CONTAINER_NAME = str({
    default: 'novu',
  });
}

if (process.env.STORAGE_SERVICE === 'GCS') {
  validators.GCS_BUCKET_NAME = str();
  validators.GCS_DOMAIN = str();
}

if (process.env.STORAGE_SERVICE === 'AWS' || !process.env.STORAGE_SERVICE) {
  validators.S3_LOCAL_STACK = str({
    default: '',
  });
  validators.S3_BUCKET_NAME = str();
  validators.S3_REGION = str();
  validators.AWS_ACCESS_KEY_ID = str();
  validators.AWS_SECRET_ACCESS_KEY = str();
}

if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'test') {
  validators.NEW_RELIC_APP_NAME = str({
    default: '',
  });
  validators.NEW_RELIC_LICENSE_KEY = str({
    default: '',
  });
  validators.REDIS_CACHE_SERVICE_HOST = str();
  validators.REDIS_CACHE_SERVICE_PORT = str();
  validators.REDIS_CACHE_PASSWORD = str();
}

export function validateEnv() {
  cleanEnv(process.env, validators);
}
