import { port, str, ValidatorSpec } from 'envalid';

export const envValidators = {
  NODE_ENV: str({
    choices: ['dev', 'test', 'production', 'ci', 'local'],
    default: 'local',
  }),
  PORT: port(),
  SENTRY_DSN: str({
    default: undefined,
  }),
} satisfies Record<string, ValidatorSpec<unknown>>;
