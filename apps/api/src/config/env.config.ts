import fs from 'node:fs';
import path from 'node:path';
import { getContextPath, NovuComponentEnum, resolveDotenvPath } from '@novu/shared';
import dotenv from 'dotenv';

// Local override directory at apps/api/ — resolves identically from compiled
// (apps/api/dist/config) and ts-node (apps/api/src/config) contexts. Used by
// devs who mount secrets there (e.g. 1Password Environments). The committed
// in-tree defaults live next to the source. `resolveDotenvPath` picks an
// explicit `.env.<NODE_ENV>` override before falling back to the generic `.env`
// override, and refuses to fall back to the generic file for `NODE_ENV=test|ci`
// so test/CI runs can never silently pick up dev-pointed secrets.
const dotenvPath = resolveDotenvPath({
  overrideDir: path.join(__dirname, '..', '..'),
  defaultDir: path.join(__dirname, '..'),
  nodeEnv: process.env.NODE_ENV,
  fileExists: fs.existsSync,
  join: path.join,
});

if (dotenvPath) {
  dotenv.config({ path: dotenvPath });
}

// portless injects PORTLESS_NGROK_URL into the API process when PORTLESS_NGROK=1.
const portlessNgrokUrl = process.env.PORTLESS_NGROK_URL?.trim();

if (portlessNgrokUrl && !process.env.AGENT_API_HOSTNAME?.trim()) {
  process.env.AGENT_API_HOSTNAME = portlessNgrokUrl;
}

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.API);
