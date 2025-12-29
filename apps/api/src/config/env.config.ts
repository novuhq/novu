import dotenv from 'dotenv';
import path from 'node:path';
import { getContextPath, getEnvFileNameForNodeEnv, NovuComponentEnum } from '@novu/shared';

console.log('ENV_PATH:', process.env.ENV_PATH);
console.log('NODE_ENV:', process.env.NODE_ENV);
dotenv.config({ path: path.join(__dirname, '..', getEnvFileNameForNodeEnv(process.env.NODE_ENV)) });

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.API);
