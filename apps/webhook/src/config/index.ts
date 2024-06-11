import * as dotenv from 'dotenv';
import { cleanEnv, str, port } from 'envalid';
import path from 'node:path';

dotenv.config();

const envFileMapper: Record<typeof process.env.NODE_ENV, string> = {
  production: '.env.production',
  test: '.env.test',
  ci: '.env.ci',
  local: '.env',
  dev: '.env.development',
};
const selectedEnvFile = envFileMapper[process.env.NODE_ENV] || '.env';

const pathToDotEnv = path.join(__dirname, '..', selectedEnvFile);

const { error } = dotenv.config({ path: pathToDotEnv });

if (error && !process.env.LAMBDA_TASK_ROOT) throw error;

cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['dev', 'test', 'production', 'ci', 'local'],
    default: 'local',
  }),
  PORT: port(),
});
