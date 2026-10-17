#!/usr/bin/env node
// Novu Box from your machine: start a box, put your checkout on it, check it, read its logs. It runs the box's own
// commands (src/box/main.ts) inside the box: a local Docker container (docker.ts), or with `--cloud` a Cloudflare
// container (cloud.ts). From docker/box, after `npm ci` once: `npm run box -- <command>`.

import type { ParseArgsOptionsConfig } from 'node:util';
import { type Command, type Parsed, runCommand } from '../node/commands.ts';
import { main } from '../node/main.ts';
import { cloudTarget } from './cloud.ts';
import { hostExists } from './cloud-http.ts';
import { deployHost } from './deploy.ts';
import { dockerTarget } from './docker.ts';
import { mail } from './mail.ts';
import { sync } from './sync.ts';
import { branchBox, githubToken, type Target } from './target.ts';

const SHARED: ParseArgsOptionsConfig = { box: { type: 'string' }, cloud: { type: 'boolean' } };

// The box --box and --cloud name.
async function targetOf(parsed: Parsed): Promise<Target> {
  const cloud = parsed.flag('cloud');
  const box = parsed.option('box') ?? (cloud ? await branchBox() : 'novu-box');

  return cloud ? cloudTarget({ box, token: githubToken }) : dockerTarget(box);
}

// Flags that mean something only for a Cloudflare box.
function cloudOnly(parsed: Parsed, names: ReadonlyArray<string>): void {
  const set = names.filter((name) => (name === 'from' ? parsed.option(name) : parsed.flag(name)));
  if (!set.length || parsed.flag('cloud')) return;
  console.error(`${set.map((name) => `--${name}`).join(', ')}: only with --cloud`);
  process.exit(2);
}

// A command on a running box; its exit code is the command's.
function onBox(
  usage: string,
  help: string,
  run: (target: Target, parsed: Parsed) => Promise<number>,
  options: ParseArgsOptionsConfig = {}
): Command {
  return {
    usage,
    help,
    options: { ...SHARED, ...options },
    run: async (parsed) => run(await targetOf(parsed), parsed),
  };
}

const commands: Record<string, Command> = {
  up: onBox(
    '[--deploy] [--from <box>] [--no-sync]',
    'start the box (baking next the first time); --cloud without --box also syncs',
    async (target, parsed) => {
      cloudOnly(parsed, ['deploy', 'from', 'no-sync']);
      // The branch's own box (no --box) is for this checkout: start it from base and put the checkout on it.
      const ownBox = parsed.flag('cloud') && !parsed.option('box');
      // --deploy: a change to docker/box (image or Worker code) goes to the host, so to every box.
      if (parsed.flag('cloud') && (parsed.flag('deploy') || !(await hostExists()))) await deployHost();
      const code = await target.up({ from: parsed.option('from'), fromBase: ownBox });

      return code === 0 && ownBox && !parsed.flag('no-sync') ? sync(target, { full: false }) : code;
    },
    { deploy: { type: 'boolean' }, from: { type: 'string' }, 'no-sync': { type: 'boolean' } }
  ),
  sync: onBox(
    '[--full]',
    'put this checkout, committed or not, on the box; rebuild what it changes',
    (target, parsed) => sync(target, { full: parsed.flag('full') }),
    { full: { type: 'boolean' } }
  ),
  doctor: onBox('', 'whether the box is fit to test on, as JSON; exits 1 if not', async (target) => {
    await target.ready();

    return target.box(['doctor']);
  }),
  logs: onBox(
    '[process] [--tail <n>] [--follow] [--errors]',
    'the last lines of one process (api, worker, bridge, …) or of all of them\n(--tail default 200; --errors: problems only)',
    async (target, parsed) => {
      await target.ready();
      const flags = ['follow', 'errors'].filter((name) => parsed.flag(name)).map((name) => `--${name}`);

      return target.box(['logs', ...parsed.args.slice(0, 1), '--tail', parsed.option('tail') ?? '200', ...flags]);
    },
    { tail: { type: 'string' }, follow: { type: 'boolean' }, errors: { type: 'boolean' } }
  ),
  exec: onBox('-- <command...>', "run a command in the box's checkout (/data/novu)", async (target, parsed) => {
    if (!parsed.args.length) throw new Error('usage: box exec -- <command...>');
    await target.ready();

    return target.exec(parsed.args);
  }),
  mail: onBox(
    '[search|id] [--limit <n>] [--html] [--check-links]',
    'what the box sent (email, SMS, push, chat): the newest, a search\n(to:a@b.c subject:Welcome tag:sms), or one message with its HTML check',
    async (target, parsed) => {
      await target.ready();
      const limit = Number(parsed.option('limit') ?? 20);
      if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit: a whole number of messages');

      return mail({
        mailUrl: target.mailUrl,
        args: parsed.args,
        limit,
        html: parsed.flag('html'),
        checkLinks: parsed.flag('check-links'),
      });
    },
    { limit: { type: 'string' }, html: { type: 'boolean' }, 'check-links': { type: 'boolean' } }
  ),
  down: onBox('', 'stop the box; its data stays (local: its volume; cloud: its snapshot)', (target) => target.down()),
  delete: onBox('--cloud', 'stop a Cloudflare box and delete it with its snapshot and Worker', (target) =>
    target.delete()
  ),
  deploy: {
    usage: '',
    help: "deploy the Cloudflare host, its image and the Slack router's address (wrangler.jsonc)",
    options: SHARED,
    run: async () => {
      await deployHost();

      return 0;
    },
  },
};

const NOTES = `every command takes:
  --box <name>  local: default novu-box, its volume is <name>-data; local boxes publish the same host ports, so one
                runs at a time. Cloud: default the current branch; the box is https://novu-box-<name>.<workers.dev>.
  --cloud       the Cloudflare box. All boxes run in one host Worker; each has its own small Worker for its address.
                \`up --cloud --deploy\` redeploys the host (after a change to docker/box), which applies to every box.
                \`up --cloud --from <box>\` starts a new box from that box's latest snapshot instead of baking.
                Without --box, \`up --cloud\` is this branch's box: a new one starts from \`base\` (when it has a
                snapshot), then gets this checkout, committed or not; \`--no-sync\` skips that.`;

await main('cli', () => runCommand('box', commands, { notes: NOTES }));
