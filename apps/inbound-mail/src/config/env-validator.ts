import { cleanEnv, json, num, port, str, ValidatorSpec } from 'envalid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validators: { [K in keyof any]: ValidatorSpec<any[K]> } = {
  NODE_ENV: str({
    choices: ['dev', 'test', 'production', 'ci', 'local'],
    default: 'local',
  }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_TLS: json({
    default: undefined,
  }),
  WORKER_DEFAULT_CONCURRENCY: num({
    default: undefined,
  }),
  WORKER_DEFAULT_LOCK_DURATION: num({
    default: undefined,
  }),
};

export function validateEnv() {
  cleanEnv(process.env, validators);
}
