import { bool, CleanedEnv, cleanEnv, num, port, str, ValidatorSpec } from 'envalid';
import { StringifyEnv } from '@novu/shared';

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;

export const envValidators = {
  MONGO_AUTO_CREATE_INDEXES: bool({ default: false }),
  MONGO_MAX_IDLE_TIME_IN_MS: num({ default: 1000 * 30 }),
  MONGO_MAX_POOL_SIZE: num({ default: 50 }),
  MONGO_MIN_POOL_SIZE: num({ default: 10 }),
  MONGO_URL: str(),
  NODE_ENV: str({ choices: ['dev', 'test', 'production', 'ci', 'local'], default: 'local' }),
  PORT: port(),
  SENTRY_DSN: str({ default: undefined }),
  TZ: str({ default: 'UTC' }),
} satisfies Record<string, ValidatorSpec<unknown>>;
