import fs from 'node:fs';
import path from 'node:path';
import { getContextPath, NovuComponentEnum, resolveDotenvPath } from '@novu/shared';
import dotenv from 'dotenv';

// Local override directory at apps/inbound-mail/. Used by devs who mount
// secrets there (e.g. 1Password Environments). The committed in-tree defaults
// live two levels up rather than one because inbound-mail is built with `tsc`
// (output ends up in `dist/src/config`) rather than nest-cli. `resolveDotenvPath`
// picks an explicit `.env.<NODE_ENV>` override before falling back to the
// generic `.env` override, and refuses to fall back to the generic file for
// `NODE_ENV=test|ci` so test/CI runs can never silently pick up dev-pointed
// secrets.
const dotenvPath = resolveDotenvPath({
  overrideDir: path.join(__dirname, '..', '..'),
  defaultDir: path.join(__dirname, '..', '..'),
  nodeEnv: process.env.NODE_ENV,
  fileExists: fs.existsSync,
  join: path.join,
});

if (dotenvPath) {
  dotenv.config({ path: dotenvPath });
}

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.INBOUND_MAIL);
