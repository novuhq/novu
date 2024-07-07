import { json, num, str, port, ValidatorSpec } from 'envalid';

export const envValidators = {
  NODE_ENV: str({
    choices: ['dev', 'test', 'production', 'ci', 'local'],
    default: 'local',
  }),
  PORT: port(),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_TLS: json({
    default: undefined,
  }),
  JWT_SECRET: str(),
  WORKER_DEFAULT_CONCURRENCY: num({
    default: undefined,
  }),
  WORKER_DEFAULT_LOCK_DURATION: num({
    default: undefined,
  }),
  SENTRY_DSN: str({
    default: undefined,
  }),
} satisfies Record<string, ValidatorSpec<unknown>>;
