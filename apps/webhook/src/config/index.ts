import * as dotenv from 'dotenv';
import { cleanEnv, str, port } from 'envalid';

dotenv.config();

const envFileMapper = {
  production: '.env.production',
  test: '.env.test',
  ci: '.env.ci',
  local: '.env',
  dev: '.env.development',
};
const selectedEnvFile = envFileMapper[process.env.NODE_ENV as any] || '.env';

const pathToDotEnv = `${__dirname}/${process.env.E2E_RUNNER ? '..' : 'src'}/${selectedEnvFile}`;

const { error } = dotenv.config({ path: pathToDotEnv });

if (error && !process.env.LAMBDA_TASK_ROOT) throw error;

cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['dev', 'test', 'production', 'ci', 'local'],
    default: 'local',
  }),
  PORT: port(),
});
