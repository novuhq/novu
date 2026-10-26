#!/usr/bin/env node

import { type Command, runCommand } from '../node/commands.ts';
import { main } from '../node/main.ts';
import { apply } from './apply.ts';
import { doctor, quiesce, resume, state, stopApply } from './doctor.ts';
import { bake, start } from './lifecycle.ts';
import { logs } from './logs.ts';
import { migrate } from './migrate.ts';
import { channelsTestUser, teamTestUser } from './seed.ts';
import { pc } from './supervisor.ts';

const token = process.env.GITHUB_TOKEN || undefined;
delete process.env.GITHUB_TOKEN;

const done = async (work: Promise<void> | void) => {
  await work;

  return 0;
};

const commands: Record<string, Command> = {
  bake: {
    usage: '[ref] [--start]',
    help: "clone ref (default next), install, build, migrate, seed -> golden /data;\n--start then boots it (the Cloudflare host's bake)",
    options: { start: { type: 'boolean' } },
    run: ({ args, flag }) => bake(args[0] ?? 'next', token, flag('start')),
  },
  start: { usage: '', help: "boot every process (the image's default command)", run: () => start() },
  apply: {
    usage: '<pr|branch|sha> [--baseline] | --bundle <file> [--full]',
    help: 'on a running box: merge a PR (or a `box sync` bundle) onto the baked commit,\nrebuild and restart what changed; --full rebuilds everything;\n--baseline (a ref that contains the baked commit) then makes it the baked commit (refreshing base)',
    options: { bundle: { type: 'string' }, full: { type: 'boolean' }, baseline: { type: 'boolean' } },
    run: ({ args, flag, option }) =>
      done(apply({ ref: args[0], bundle: option('bundle'), full: flag('full'), baseline: flag('baseline'), token })),
  },
  state: {
    usage: '',
    help: 'the baked and applied commits, and the bake or apply running, as JSON',
    run: () => done(console.log(JSON.stringify(state()))),
  },
  doctor: {
    usage: '',
    help: 'whether the box is fit to test on, as JSON; exits 1 if not',
    run: async () => {
      const report = await doctor();
      console.log(JSON.stringify(report, null, 2));

      return report.ok ? 0 : 1;
    },
  },
  logs: {
    usage: '[process] [--tail <n>] [--follow] [--errors]',
    help: 'the last lines (default 200) of one process, or of all of them;\n--errors for warnings and errors only',
    options: { tail: { type: 'string' }, follow: { type: 'boolean' }, errors: { type: 'boolean' } },
    run: ({ args, flag, option }) => {
      const tail = Number(option('tail') ?? 200);
      if (!Number.isInteger(tail) || tail < 0) throw new Error(`--tail ${option('tail')}: expected a whole number`);

      return done(logs({ name: args[0], tail, follow: flag('follow'), errors: flag('errors') }));
    },
  },
  quiesce: {
    usage: '',
    help: 'stop every process, the data stores last, leaving the supervisor up for a snapshot',
    run: () => done(quiesce()),
  },
  resume: { usage: '', help: 'start again what quiesce stopped (when the snapshot failed)', run: () => done(resume()) },
  'stop-apply': {
    usage: '',
    help: 'stop the apply that runs, and all it started (CI, for a newer push)',
    run: () => done(stopApply()),
  },
  status: { usage: '', help: 'list processes', run: () => done(pc(['process', 'list'])) },
  team: {
    usage: '<email>',
    help: "put a test user's own org (agent+<box>.<id>@novu.co, after its onboarding) on the Team plan",
    run: ({ args }) => {
      if (!args[0]) throw new Error('usage: box team <email>');

      return done(teamTestUser(args[0]));
    },
  },
  channels: {
    usage: '<email>',
    help: "send a test user's own org's email to Mailpit and its SMS, push and chat to the sink, as the seed org's",
    run: ({ args }) => {
      if (!args[0]) throw new Error('usage: box channels <email>');

      return done(channelsTestUser(args[0]));
    },
  },
  migrate: {
    usage: '',
    help: 'replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket\n(run by process-compose before the apps)',
    run: () => done(migrate()),
  },
};

await main('box', () => runCommand('box', commands));
