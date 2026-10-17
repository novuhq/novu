
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import * as z from 'zod';
import { log } from '../node/main.ts';
import { run } from '../node/process.ts';
import { fromJson } from '../shared/contracts.ts';
import { parseEnvFile } from '../shared/env-file.ts';
import { DOMAIN, HOST, ROUTER, SECRETS, SLACK_CHANNEL } from '../shared/names.ts';
import { HERE } from './docker.ts';

const WRANGLER = join(HERE, 'node_modules/.bin/wrangler');
const CONFIG = join(os.homedir(), '.config/novu-box');
const SLACK_ENV = process.env.BOX_SLACK_ENV ?? join(CONFIG, 'slack.env');
const IMAGE_CONFIG = join(HERE, '.wrangler.box-image.json');
const HostConfig = z.looseObject({ containers: z.array(z.looseObject({})) });

function readKeys(file: string, keys: ReadonlyArray<string>): Record<string, string> | null {
  if (!fs.existsSync(file)) return null;
  const env = parseEnvFile(fs.readFileSync(file, 'utf8'));

  return Object.fromEntries(keys.flatMap((key) => (env[key] ? [[key, env[key]]] : [])));
}

function secrets() {
  const slack = readKeys(SLACK_ENV, ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET']);
  if (!slack) log(`no ${SLACK_ENV}, so boxes get no Slack`);
  const github = readKeys(join(CONFIG, 'github.env'), ['GITHUB_READ_TOKEN']);
  // wrangler's --secrets-file only adds: a GITHUB_READ_TOKEN the host already has stays.
  if (!github)
    log(
      `no ${CONFIG}/github.env: boxes fetch with the host's GITHUB_READ_TOKEN if it has one, else their caller's token`
    );
  const cloudflare = readKeys(join(CONFIG, 'cloudflare.env'), ['CLOUDFLARE_API_TOKEN']);
  if (!cloudflare?.CLOUDFLARE_API_TOKEN)
    throw new Error(`${CONFIG}/cloudflare.env is missing; the host creates and deletes boxes' Workers with it`);

  return { slack, all: { ...readKeys(join(HERE, '.env'), SECRETS), ...slack, ...github, ...cloudflare } };
}

export async function deployHost(): Promise<void> {
  const idle = process.env.BOX_IDLE_MINUTES;
  if (idle && !(Number(idle) > 0)) throw new Error(`BOX_IDLE_MINUTES=${idle}: a number of minutes, over 0`);
  const { slack, all } = secrets();
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'box-deploy-'));
  const secretsFile = join(dir, 'secrets.json');
  fs.writeFileSync(secretsFile, JSON.stringify(all), { mode: 0o600 });
  try {
    await run(WRANGLER, ['deploy', '--dry-run', '--outdir', join(dir, 'thin'), '-c', 'wrangler.slack.jsonc'], {
      cwd: HERE,
      stdio: 'ignore',
    });
    const thin = fs.readFileSync(join(dir, 'thin/thin.js'), 'utf8');
    const vars = [
      ...(idle ? [`IDLE_MINUTES:${idle}`] : []),
      ...(slack ? [`SLACK_ROUTER_URL:https://${ROUTER}.${DOMAIN}`, `SLACK_CHANNEL:${SLACK_CHANNEL}`] : []),
    ].flatMap((pair) => ['--var', pair]);
    log(`deploying ${HOST} with wrangler; this applies to every box`);
    const define = ['--define', `THIN_WORKER:${JSON.stringify(thin)}`];
    await run(WRANGLER, ['deploy', '--secrets-file', secretsFile, ...define, ...vars, ...onImage()], { cwd: HERE });
    if (slack) await run(WRANGLER, ['deploy', '-c', 'wrangler.slack.jsonc'], { cwd: HERE });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(IMAGE_CONFIG, { force: true });
  }
}

// BOX_IMAGE=<registry.cloudflare.com/...@sha256:...> deploys the code alone on that image, from a copy of
// wrangler.jsonc next to it (its paths are relative to it); boxes' snapshots restore only on their own image.
function onImage(): Array<string> {
  const image = process.env.BOX_IMAGE;
  if (!image) return [];
  const config = fromJson(HostConfig).parse(
    fs.readFileSync(join(HERE, 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')
  );
  const containers = config.containers.map((container) => ({ ...container, images: { box: { image } } }));
  fs.writeFileSync(IMAGE_CONFIG, JSON.stringify({ ...config, containers }));
  log(`on the image ${image}`);

  return ['-c', IMAGE_CONFIG];
}
