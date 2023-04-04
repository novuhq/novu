import { json, port, str, num, ValidatorSpec, makeValidator } from 'envalid';
import * as envalid from 'envalid';

const str32 = makeValidator((variable) => {
  if (!(typeof variable === 'string') || variable.length != 32) {
    throw new Error('Expected to be string 32 char long');
  }

  return variable;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validators: { [K in keyof any]: ValidatorSpec<any[K]> } = {
  NODE_ENV: str({
    choices: ['dev', 'test', 'prod', 'ci', 'local', 'staging'],
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
  SEGMENT_TOKEN: str({
    default: undefined,
  }),
};

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
  envalid.cleanEnv(process.env, validators);
}
