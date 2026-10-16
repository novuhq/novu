// `box deploy` (and `box up --cloud --deploy`): the host Worker, the box image and the Slack router's address, from
// alchemy.run.ts, signed in with your wrangler login (or CLOUDFLARE_API_TOKEN when it's set). Deploys run one at a
// time, from a laptop.

import { join } from 'node:path';
import { Effect, Schema } from 'effect';
import { ACCOUNT_ID, HOST } from '../shared/names.ts';
import { HERE } from './docker.ts';
import { CliError, log, output, run } from './run.ts';

const WRANGLER = ['--yes', 'wrangler@4.150.0'];

// wrangler's OAuth token for the alchemy process; it's never printed.
const cloudflareToken = Effect.suspend(() =>
  process.env.CLOUDFLARE_API_TOKEN
    ? Effect.succeed(process.env.CLOUDFLARE_API_TOKEN)
    : output('npx', [...WRANGLER, 'auth', 'token', '--json']).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Struct({ token: Schema.String })))),
        Effect.map(({ token }) => token),
        Effect.mapError(() => new CliError({ message: 'no Cloudflare login: run `npx wrangler login`' }))
      )
);

export const deployHost = Effect.gen(function* () {
  const token = yield* cloudflareToken;
  log(`deploying ${HOST} with Alchemy; this applies to every box`);
  yield* run(join(HERE, 'node_modules/.bin/alchemy'), ['deploy', '--stage', 'prod', '--yes', '--no-input'], {
    cwd: HERE,
    env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID },
  });
});
