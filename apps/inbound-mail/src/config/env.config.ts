import path from 'node:path';
import { getContextPath, getEnvFileNameForNodeEnv, NovuComponentEnum } from '@novu/shared';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', getEnvFileNameForNodeEnv(process.env.NODE_ENV)) });

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.INBOUND_MAIL);
