import * as dotenv from 'dotenv';

dotenv.config();

const envFileMapper = {
  production: '.env.production',
  test: '.env.test',
  ci: '.env.ci',
  local: '.env',
  dev: '.env.development',
};
const selectedEnvFile = envFileMapper[process.env.NODE_ENV] || '.env';

const path = `${__dirname}/../${selectedEnvFile}`;

const { error } = dotenv.config({ path });
if (error && !process.env.LAMBDA_TASK_ROOT) throw error;
