// Novu Box on Cloudflare, what stays put: the host Worker `novu-box-core` with the Box and Router Durable Objects
// (src/cloud/host.ts), the box image, the host's secrets, and the Slack router's address `novu-box-slack`. Boxes
// themselves aren't here: each is a Durable Object in the host and a Worker the host uploads at runtime (boxes.ts),
// so `alchemy destroy` would orphan them. Deploy with `box deploy` (src/cli/deploy.ts), from a laptop, one at a time;
// the state is in the account (Cloudflare.state()).
//
// The image, the secrets and the idle time belong to the host, so they apply to every box. A box's snapshot only
// restores on the image it was taken on. Alchemy names a build by its inputs (image/Dockerfile.dockerignore says
// which) and reuses it while they don't change; BOX_IMAGE=<registry.cloudflare.com/...@sha256:...> deploys the code
// alone on a given image.
//
// Secrets: SECRETS from docker/box/.env, for every box; and, for the host only: Novu Bot's credentials
// (~/.config/novu-box/slack.env: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET), a read-only GitHub token (github.env:
// GITHUB_READ_TOKEN, fine-grained, Contents and Checks on novuhq/novu and novuhq/packages-enterprise) for the boxes'
// fetches and CI lookups instead of the caller's token, and CLOUDFLARE_API_TOKEN (cloudflare.env, Workers Scripts:
// Edit on the Novu account) for /__box/boxes. Without slack.env boxes get no Slack.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as Alchemy from 'alchemy';
import * as Cloudflare from 'alchemy/Cloudflare';
import { Effect, Redacted } from 'effect';
import { parseEnvFile } from './src/shared/env-file.ts';
import { ACCOUNT_ID, COMPATIBILITY_DATE, DOMAIN, HOST, ROUTER, SECRETS, SLACK_CHANNEL } from './src/shared/names.ts';

const HERE = import.meta.dirname;
const CONFIG = path.join(os.homedir(), '.config/novu-box');
const SLACK_ENV = process.env.BOX_SLACK_ENV ?? path.join(CONFIG, 'slack.env');

// The named keys from an env file, or null when the file isn't there.
function readKeys(file: string, keys: ReadonlyArray<string>): Record<string, string> | null {
  if (!fs.existsSync(file)) return null;
  const env = parseEnvFile(fs.readFileSync(file, 'utf8'));

  return Object.fromEntries(keys.flatMap((key) => (env[key] ? [[key, env[key]]] : [])));
}

const box = readKeys(path.join(HERE, '.env'), SECRETS) ?? {};
const slack = readKeys(SLACK_ENV, ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET']);
if (!slack) console.log(`no ${SLACK_ENV}, so boxes get no Slack`);
const github = readKeys(path.join(CONFIG, 'github.env'), ['GITHUB_READ_TOKEN']);
if (!github) console.log(`no ${CONFIG}/github.env, so boxes fetch with their caller's token, and CI can't apply`);
const cloudflare = readKeys(path.join(CONFIG, 'cloudflare.env'), ['CLOUDFLARE_API_TOKEN']);
if (!cloudflare?.CLOUDFLARE_API_TOKEN)
  throw new Error(`${CONFIG}/cloudflare.env is missing; the host creates and deletes boxes' Workers with it`);

const secrets = Object.fromEntries(
  Object.entries({ ...box, ...slack, ...github, ...cloudflare }).map(([key, value]) => [key, Redacted.make(value)])
);

const BoxImage = process.env.BOX_IMAGE
  ? Cloudflare.Container('BoxImage', { schedulingPolicy: 'durable_object', image: process.env.BOX_IMAGE })
  : Cloudflare.Container('BoxImage', {
      schedulingPolicy: 'durable_object',
      context: HERE,
      dockerfile: 'image/Dockerfile',
      publish: { repository: 'novu-box' },
    });

export default Alchemy.Stack(
  'novu-box',
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const host = yield* Cloudflare.Worker('Host', {
      name: HOST,
      main: path.join(HERE, 'src/cloud/host.ts'),
      compatibility: { date: COMPATIBILITY_DATE },
      observability: { enabled: true },
      env: {
        BOX: Cloudflare.DurableObject('Box', { containers: [BoxImage] }),
        ROUTER: Cloudflare.DurableObject('Router'),
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        // Minutes without requests before a box saves itself and stops; default 60 (host.ts).
        ...(process.env.BOX_IDLE_MINUTES && { IDLE_MINUTES: process.env.BOX_IDLE_MINUTES }),
        ...(slack && { SLACK_ROUTER_URL: `https://${ROUTER}.${DOMAIN}`, SLACK_CHANNEL }),
        ...secrets,
      },
    });
    // Novu Bot's request URL is https://novu-box-slack.<DOMAIN>/slack. The Worker existed before this stack (the
    // wrangler-deployed host uploaded it), hence the adoption.
    if (slack)
      yield* Cloudflare.Worker('Router', {
        name: ROUTER,
        main: path.join(HERE, 'src/cloud/thin.ts'),
        compatibility: { date: COMPATIBILITY_DATE },
        observability: { enabled: true },
        env: { BOX: Cloudflare.DurableObject('Router', { scriptName: HOST }), BOX_NAME: 'router' },
      }).pipe(Alchemy.AdoptPolicy.adopt(true));

    return { url: host.url };
  })
);
