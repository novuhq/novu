import * as dotenv from 'dotenv';
import { cleanEnv, CleanedEnv } from 'envalid';
import { getContextPath, NovuComponentEnum, StringifyEnv } from '@novu/shared';
import { envValidators } from './env.validators';

dotenv.config();

export function validateEnv() {
  return cleanEnv(process.env, envValidators);
}

export type ValidatedEnv = StringifyEnv<CleanedEnv<typeof envValidators>>;

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.WIDGET);

const processEnv = validateEnv();
export const API_URL = processEnv.REACT_APP_API_URL;
export const WS_URL = processEnv.REACT_APP_WS_URL;
