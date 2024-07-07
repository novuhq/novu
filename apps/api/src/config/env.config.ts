import * as dotenv from 'dotenv';
import path from 'node:path';
import { cleanEnv, CleanedEnv } from 'envalid';
import { getContextPath, NovuComponentEnum, getEnvFileNameForNodeEnv, StringifyEnv } from '@novu/shared';
import { envValidators } from './env.validators';

dotenv.config({ path: path.join(__dirname, '..', getEnvFileNameForNodeEnv(process.env)) });

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.API);
