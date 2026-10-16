#!/usr/bin/env node
// Novu Box, the commands that run inside the box. Plain Node, no npm dependencies. From your machine, use
// `cli.mjs`, which calls these. This file is the command map; lifecycle.mjs, apply.mjs, migrate.mjs and logs.mjs do
// the work, on what lib.mjs shares.
//
//   box bake [ref] [--start]    clone ref (default next), install, build, migrate, seed  -> golden /data;
//                               --start then boots it (the Cloudflare Worker's bake)
//   box start                   boot every process (the image's default command)
//   box apply <pr|branch|sha>   on a running box: merge a PR onto the baked commit, rebuild and restart what changed
//   box apply --bundle <file>   the same for a bundle from `cli.mjs sync` (a checkout's changes)
//   box state                   the baked and applied commits, and the bake or apply running, as JSON
//   box doctor                  whether the box is fit to test on, as JSON; exits 1 if not
//   box logs [process]          the last lines of one process, or of all of them (--tail <n>, default 200;
//                               --follow; --errors for warnings and errors only)
//   box quiesce                 stop every process, the data stores last, leaving the supervisor up for a snapshot
//   box resume                  start again what quiesce stopped (when the snapshot failed)
//   box status                  list processes
//   box migrate                 replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket
//                               (run by process-compose before the apps)

import { parseArgs } from 'node:util';
import { apply } from './apply.mjs';
import { log, pc } from './lib.mjs';
import { bake, doctor, quiesce, resume, start, state } from './lifecycle.mjs';
import { logs } from './logs.mjs';
import { migrate } from './migrate.mjs';

// The caller's GitHub token (push-capable from a laptop, the host's read-only one on Cloudflare), while the box runs
// PR code: it leaves the environment before any command runs, and only bake and apply get it, for their git fetches
// and the CI lookup.
const token = process.env.GITHUB_TOKEN;
delete process.env.GITHUB_TOKEN;

const parse = (options) => parseArgs({ args: process.argv.slice(3), options, allowPositionals: true });

const commands = {
  bake: () => {
    const { values, positionals } = parse({ start: { type: 'boolean', default: false } });

    return bake(positionals[0] ?? 'next', { token, start: Boolean(values.start) });
  },
  start,
  migrate,
  apply: () => {
    const { values, positionals } = parse({ bundle: { type: 'string' }, full: { type: 'boolean' } });

    return apply({ ref: positionals[0], bundle: values.bundle, full: Boolean(values.full), token });
  },
  state: () => console.log(JSON.stringify(state())),
  doctor,
  logs: () => {
    const { values, positionals } = parse({
      tail: { type: 'string', default: '200' },
      follow: { type: 'boolean', default: false },
      errors: { type: 'boolean', default: false },
    });

    return logs({
      name: positionals[0],
      tail: Number(values.tail),
      follow: Boolean(values.follow),
      errors: Boolean(values.errors),
    });
  },
  quiesce,
  resume,
  status: () => pc(['process', 'list']),
};

const command = commands[process.argv[2]];
if (!command) {
  console.error(`usage: box ${Object.keys(commands).join('|')}`);
  process.exit(2);
}

try {
  await command();
} catch (error) {
  log(`ERROR: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
