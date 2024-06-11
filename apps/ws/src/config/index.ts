import * as dotenv from 'dotenv';
import { cleanEnv, json, num, str, port } from 'envalid';
import { getContextPath, NovuComponentEnum } from '@novu/shared';
const path = require('path');

dotenv.config();

const envFileMapper: Record<string, string> = {
  production: '.env.production',
  test: '.env.test',
  ci: '.env.ci',
  local: '.env',
  dev: '.env.development',
};
const selectedEnvFile = envFileMapper[process.env.NODE_ENV as string] || '.env';

const pathToDotEnv = path.join(__dirname, '..', selectedEnvFile);

const { error } = dotenv.config({ path: pathToDotEnv });

if (error && !process.env.LAMBDA_TASK_ROOT) throw error;

cleanEnv(process.env, {
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
});

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.WS);
