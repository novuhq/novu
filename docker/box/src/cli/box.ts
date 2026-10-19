import type { ParseArgsOptionsConfig } from 'node:util';
import { type Command, type Parsed, runCommand } from '../node/commands.ts';
import { main } from '../node/main.ts';
import { output } from '../node/process.ts';
import { type CloudTarget, cloudTarget } from './cloud.ts';
import { githubToken, hostExists } from './cloud-http.ts';
import { deployHost } from './deploy.ts';
import { mail } from './mail.ts';
import { sync } from './sync.ts';
import { createUser, deleteUser, inUserBox, listUsers } from './user.ts';

const SHARED: ParseArgsOptionsConfig = { box: { type: 'string' } };

async function branchBox(): Promise<string> {
  const name = (await output('git', ['branch', '--show-current']))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/, '');
  if (!name) throw new Error('not on a branch; pass --box <name>');

  return name;
}

function onBox(
  usage: string,
  help: string,
  run: (target: CloudTarget, parsed: Parsed) => Promise<number>,
  options: ParseArgsOptionsConfig = {}
): Command {
  return {
    usage,
    help,
    options: { ...SHARED, ...options },
    run: async (parsed) =>
      run(cloudTarget({ box: parsed.option('box') ?? (await branchBox()), token: githubToken }), parsed),
  };
}

const commands: Record<string, Command> = {
  up: onBox(
    '[--deploy] [--from <box>] [--no-sync]',
    'start the box (baking next the first time); without --box also syncs',
    async (target, parsed) => {
      const ownBox = !parsed.option('box');
      if (parsed.flag('deploy') || !(await hostExists())) await deployHost();
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
  user: {
    usage: 'create|list|channels|team|delete [email]',
    help: "dashboard test users, agent+<box>.<id>@novu.co, each for one box only:\ncreate [--json]: one for the box, with its password; list [--limit <n>]: and which a create\nwould delete first at that many (default 50); after its onboarding, channels <email>: its own\norg's messages to Mailpit and the sink, team <email>: its own org on Team; delete <email>",
    options: { ...SHARED, json: { type: 'boolean' }, limit: { type: 'string' } },
    run: async (parsed) => {
      const [action, email] = parsed.args;
      const limit = Number(parsed.option('limit') ?? 50);
      if (action === 'create') return createUser(parsed.option('box') ?? (await branchBox()), parsed.flag('json'));
      if (action === 'list' && Number.isInteger(limit) && limit > 0) return listUsers(limit);
      if ((action === 'team' || action === 'channels') && email) return inUserBox(action, email);
      if (action === 'delete' && email) return deleteUser(email);
      throw new Error(
        'usage: box user create [--json] | list [--limit <n>] | channels <email> | team <email> | delete <email>'
      );
    },
  },
  down: onBox('', 'save the box to its snapshot and stop it; the next request wakes it', (target) => target.down()),
  delete: onBox('', 'stop the box, forget its snapshot, delete its Worker and test users', (target) => target.delete()),
  deploy: {
    usage: '',
    help: "deploy the Cloudflare host, its image and the Slack router's address (wrangler.jsonc)",
    options: {},
    run: async () => {
      await deployHost();

      return 0;
    },
  },
};

const NOTES = `boxes run on Cloudflare: all of them in one host Worker, each with its own small Worker for its address.
every command but deploy takes:
  --box <name>  default the current branch; the box is https://novu-box-<name>.<workers.dev>.
                \`up --deploy\` redeploys the host (after a change to docker/box), which applies to every box.
                \`up --from <box>\` starts a new box from that box's latest snapshot instead of baking.
                Without --box, \`up\` is this branch's box: a new one starts from \`base\` (when it has a
                snapshot), then gets this checkout, committed or not; \`--no-sync\` skips that.`;

await main('cli', () => runCommand('box', commands, { notes: NOTES }));
