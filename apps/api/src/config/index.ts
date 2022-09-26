import * as dotenv from 'dotenv';
import { getContextPath, NovuComponentEnum } from '@novu/shared';
import * as envalid from 'envalid';
import { str, url, port, ValidatorSpec } from 'envalid';

dotenv.config();

const envFileMapper = {
  prod: '.env.production',
  test: '.env.test',
  ci: '.env.ci',
  local: '.env',
  dev: '.env.development',
};
const selectedEnvFile = envFileMapper[process.env.NODE_ENV] || '.env';

const path = `${__dirname}/${process.env.E2E_RUNNER ? '..' : 'src'}/${selectedEnvFile}`;

const { error } = dotenv.config({ path });
if (error && !process.env.LAMBDA_TASK_ROOT) throw error;

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.API);
