import fs from 'node:fs';
import path from 'node:path';
import { getContextPath, getEnvFileNameForNodeEnv, NovuComponentEnum } from '@novu/shared';
import dotenv from 'dotenv';

// Local override at apps/inbound-mail/.env. Used by devs who mount secrets
// there (e.g. 1Password Environments local .env files). In Docker/CI/staging/
// prod this file does not exist, so we fall back to the standard NODE_ENV-
// based file. Path arithmetic matches the existing default (one extra `..`
// vs. nest-cli apps because inbound-mail is built with tsc, not nest-cli).
const localOverridePath = path.join(__dirname, '..', '..', '.env');
const defaultPath = path.join(__dirname, '..', '..', getEnvFileNameForNodeEnv(process.env.NODE_ENV));

dotenv.config({
  path: fs.existsSync(localOverridePath) ? localOverridePath : defaultPath,
});

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.INBOUND_MAIL);
