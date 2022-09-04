import { port, str, url, ValidatorSpec, bool } from 'envalid';
import * as envalid from 'envalid';

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
  DISABLE_USER_REGISTRATION: bool(),
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
};

if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'test') {
  validators.SENTRY_DSN = str();
}

export function validateEnv() {
  envalid.cleanEnv(process.env, validators);
}
