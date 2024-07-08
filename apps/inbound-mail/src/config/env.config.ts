import dotenv from 'dotenv';
import path from 'node:path';
import { getContextPath, NovuComponentEnum, getEnvFileNameForNodeEnv } from '@novu/shared';

dotenv.config({ path: path.join(__dirname, '..', getEnvFileNameForNodeEnv(process.env)) });

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.INBOUND_MAIL);
