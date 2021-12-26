import * as dotenv from 'dotenv';
import * as envalid from 'envalid';
import { str, url, port, ValidatorSpec } from 'envalid';

dotenv.config();

const envFileMapper = {
  prod: '.env.production',
  test: '.env.test',
  ci: '.env.ci',
  local: '.env.local',
  dev: '.env.development',
};
const selectedEnvFile = envFileMapper[process.env.NODE_ENV] || '.env.local';

const path = `${__dirname}/../${selectedEnvFile}`;

const { error } = dotenv.config({ path });
if (error && !process.env.LAMBDA_TASK_ROOT) throw error;
