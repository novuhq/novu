import { json, port, str, ValidatorSpec } from 'envalid';
import * as envalid from 'envalid';

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
};

export function validateEnv() {
  envalid.cleanEnv(process.env, validators);
}
