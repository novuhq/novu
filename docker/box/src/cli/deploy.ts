import fs from 'node:fs';
import { join } from 'node:path';
import * as z from 'zod';
import { log } from '../node/main.ts';
import { output, run } from '../node/process.ts';
import { fromJson } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { HOST, SECRETS } from '../shared/names.ts';
import { hostExists } from './cloud-http.ts';

const HERE = new URL('../..', import.meta.url).pathname;
const WRANGLER = join(HERE, 'node_modules/.bin/wrangler');
const IMAGE_CONFIG = join(HERE, '.wrangler.box-image.json');
const HostConfig = z.looseObject({ containers: z.array(z.looseObject({})) });
const SecretList = z.array(z.object({ name: z.string() }));
const HOST_ONLY_SECRETS = [
  'GITHUB_READ_TOKEN',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'TESTERARMY_API_KEY',
  'CURSOR_BOX_TOKEN',
];
const OPTIONAL_SECRETS = new Set<string>([
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'BULL_MQ_PRO_NPM_TOKEN',
  'NX_CLOUD_ACCESS_TOKEN',
  'TESTERARMY_API_KEY',
  'CURSOR_BOX_TOKEN',
]);

function missingSecrets(names: ReadonlyArray<string>): { required: Array<string>; optional: Array<string> } {
  const missing = [...SECRETS, ...HOST_ONLY_SECRETS].filter((name) => !names.includes(name));

  return {
    required: missing.filter((name) => !OPTIONAL_SECRETS.has(name)),
    optional: missing.filter((name) => OPTIONAL_SECRETS.has(name)),
  };
}

async function checkSecrets(): Promise<void> {
  if (!(await hostExists())) return;
  const listed = await output(WRANGLER, ['secret', 'list', '--name', HOST, '--format', 'json'], { cwd: HERE }).catch(
    (error: Error) => {
      log(`WARN: couldn't list ${HOST}'s secrets: ${messageOf(error)}`);

      return null;
    }
  );
  if (listed === null) return;
  const { required, optional } = missingSecrets(
    fromJson(SecretList)
      .parse(listed)
      .map(({ name }) => name)
  );
  for (const name of required)
    log(`WARN: ${HOST} has no secret ${name}; set it in Cloudflare: \`npx wrangler secret put ${name}\` in docker/box`);
  if (optional.length) log(`optional secrets ${HOST} doesn't have: ${optional.join(', ')}`);
}

export async function deployHost(): Promise<void> {
  const idle = process.env.BOX_IDLE_MINUTES;
  if (idle && !(Number(idle) > 0)) throw new Error(`BOX_IDLE_MINUTES=${idle}: a number of minutes, over 0`);
  await checkSecrets();
  try {
    const vars = idle ? ['--var', `IDLE_MINUTES:${idle}`] : [];
    log(`deploying ${HOST} with wrangler; this applies to every box`);
    await run(WRANGLER, ['deploy', ...vars, ...onImage()], { cwd: HERE });
  } finally {
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
