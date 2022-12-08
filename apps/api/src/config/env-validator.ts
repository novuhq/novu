import { makeValidator, port, str, url, ValidatorSpec } from 'envalid';
import * as envalid from 'envalid';

const str32 = makeValidator((variable) => {
  if (!(typeof variable === 'string') || variable.length != 32) {
    throw new Error('Expected to be string 32 char long');
  }

  return variable;
});

const recommended = makeValidator((variable?: string) => {
  if (variable == null || variable === '') {
    // eslint-disable-next-line no-console
    console.warn(`The env var is optional, but recommended.`);
  }

  return '';
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validators: { [K in keyof any]: ValidatorSpec<any[K]> } = {
  NODE_ENV: str({
    choices: ['dev', 'test', 'prod', 'ci', 'local'],
    default: 'local',
  }),
  S3_LOCAL_STACK: str({
    default: '',
  }),
  S3_BUCKET_NAME: str(),
  S3_REGION: str(),
  PORT: port(),
  FRONT_BASE_URL: url(),
  DISABLE_USER_REGISTRATION: str({
    default: 'false',
    choices: ['false', 'true'],
  }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  JWT_SECRET: str(),
  SENDGRID_API_KEY: str({
    default: '',
  }),
  MONGO_URL: str(),
  AWS_ACCESS_KEY_ID: str(),
  AWS_SECRET_ACCESS_KEY: str(),
  NOVU_API_KEY: str({
    default: '',
  }),
  STORE_ENCRYPTION_KEY: str32(),
  NEW_RELIC_APP_NAME: str({
    default: '',
  }),
  NEW_RELIC_LICENSE_KEY: str({
    default: '',
  }),
  REDIS_CACHE_HOST: recommended({ default: '' }),
  REDIS_CACHE_PORT: recommended({ default: '' }),
};

if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'test') {
  validators.SENTRY_DSN = str({
    default: '',
  });
  validators.VERCEL_CLIENT_ID = str({
    default: '',
  });
  validators.VERCEL_CLIENT_SECRET = str({
    default: '',
  });
  validators.VERCEL_REDIRECT_URI = url({
    default: 'https://web.novu.co/auth/login',
  });
  validators.VERCEL_BASE_URL = url({
    default: 'https://api.vercel.com',
  });
}

export function validateEnv() {
  envalid.cleanEnv(process.env, validators);
}
