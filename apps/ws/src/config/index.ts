import * as dotenv from 'dotenv';
import * as envalid from 'envalid';
import { str, port } from 'envalid';

dotenv.config();

let path;
switch (process.env.NODE_ENV) {
  case 'prod':
    path = `${__dirname}/../.env.production`;
    break;
  case 'test':
    path = `${__dirname}/../.env.test`;
    break;
  case 'ci':
    path = `${__dirname}/../.env.ci`;
    break;
  case 'dev':
    path = `${__dirname}/../.env.development`;
    break;
  default:
    path = `${__dirname}/../.env`;
}

const { error } = dotenv.config({ path });
if (error && !process.env.LAMBDA_TASK_ROOT) throw error;

envalid.cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['dev', 'test', 'prod', 'ci'],
    default: 'dev',
  }),
  PORT: port(),
  REDIS_HOST: str(),
  REDIS_PORT: port(),
  JWT_SECRET: str(),
});
