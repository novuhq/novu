import { StringifyEnv } from '@novu/shared';
import { bool, CleanedEnv, cleanEnv, json, num, port, str, ValidatorSpec } from 'envalid';

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;
const processEnv = process.env as Record<string, string>;

export const envValidators = {
  TZ: str({ default: 'UTC' }),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local'], default: 'local' }),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  REDIS_TLS: json({ default: undefined }),
  WORKER_DEFAULT_CONCURRENCY: num({ default: undefined }),
  WORKER_DEFAULT_LOCK_DURATION: num({ default: undefined }),
  INBOUND_PARSE_MAIL_WORKER_CONCURRENCY: num({ default: undefined }),
  ENABLE_OTEL: bool({ default: false }),
  ENABLE_OTEL_LOGS: bool({ default: false }),
  OTEL_PROMETHEUS_PORT: num({ default: 9464 }),
  // New Relic credentials are only required for Novu Cloud / Enterprise builds.
  ...(processEnv.IS_SELF_HOSTED !== 'true' &&
    processEnv.NOVU_ENTERPRISE === 'true' && {
      NEW_RELIC_APP_NAME: str({ default: '' }),
      NEW_RELIC_LICENSE_KEY: str({ default: '' }),
    }),
} satisfies Record<string, ValidatorSpec<unknown>>;
