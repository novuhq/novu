import * as dotenv from 'dotenv';
import { cleanEnv, json, num, str, port } from 'envalid';
import { getContextPath, NovuComponentEnum } from '@novu/shared';

dotenv.config();

let path;

switch (process.env.NODE_ENV) {
  case 'production':
    path = `${__dirname}/../.env.production`;
    break;
  case 'test':
    path = `${__dirname}/../.env.test`;
    break;
  case 'ci':
    path = `${__dirname}/../.env.ci`;
    break;
  case 'local':
    path = `${__dirname}/../.env`;
    break;
  case 'dev':
    path = `${__dirname}/../.env.development`;
    break;
  default:
    path = `${__dirname}/../.env`;
}

const { error } = dotenv.config({ path });

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
