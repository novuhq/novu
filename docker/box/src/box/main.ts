#!/usr/bin/env node
// Novu Box, the commands that run inside the box. From your machine, use the CLI (`npm run box -- <command>`, see
// src/cli), which calls these.

import { type Command, runCommand } from '../node/commands.ts';
import { main } from '../node/main.ts';
import { apply } from './apply.ts';
import { doctor, quiesce, resume, state, stopApply } from './doctor.ts';
import { bake, start } from './lifecycle.ts';
import { logs } from './logs.ts';
import { migrate } from './migrate.ts';
import { pc } from './supervisor.ts';

// The caller's GitHub token (push-capable from a laptop, the host's read-only one on Cloudflare), while the box runs
// PR code: it leaves the environment before any command runs, and only bake and apply get it, for their git fetches
// and the CI lookup.
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
    usage: '<pr|branch|sha> | --bundle <file> [--full]',
    help: 'on a running box: merge a PR (or a `box sync` bundle) onto the baked commit,\nrebuild and restart what changed; --full rebuilds everything',
    options: { bundle: { type: 'string' }, full: { type: 'boolean' } },
    run: ({ args, flag, option }) => done(apply({ ref: args[0], bundle: option('bundle'), full: flag('full'), token })),
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
  migrate: {
    usage: '',
    help: 'replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket\n(run by process-compose before the apps)',
    run: () => done(migrate()),
  },
};

await main('box', () => runCommand('box', commands));
