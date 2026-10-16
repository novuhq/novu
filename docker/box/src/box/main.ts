#!/usr/bin/env node
// Novu Box, the commands that run inside the box. From your machine, use the CLI (`npm run box -- <command>`, see
// src/cli), which calls these. This file is the command map; lifecycle.ts, apply.ts, migrate.ts and logs.ts do the
// work.
//
//   box bake [ref] [--start]    clone ref (default next), install, build, migrate, seed  -> golden /data;
//                               --start then boots it (the Cloudflare host's bake)
//   box start                   boot every process (the image's default command)
//   box apply <pr|branch|sha>   on a running box: merge a PR onto the baked commit, rebuild and restart what changed
//   box apply --bundle <file>   the same for a bundle from `box sync` (a checkout's changes)
//   box state                   the baked and applied commits, and the bake or apply running, as JSON
//   box doctor                  whether the box is fit to test on, as JSON; exits 1 if not
//   box logs [process]          the last lines of one process, or of all of them (--tail <n>, default 200;
//                               --follow; --errors for warnings and errors only)
//   box quiesce                 stop every process, the data stores last, leaving the supervisor up for a snapshot
//   box resume                  start again what quiesce stopped (when the snapshot failed)
//   box stop-apply              stop the apply that runs, and all it started (CI, for a newer push)
//   box status                  list processes
//   box migrate                 replica set, Redis Cluster, Mongo indexes, ClickHouse migrations, S3 bucket
//                               (run by process-compose before the apps)

import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import { Effect, Layer, Option, Redacted } from 'effect';
import { Argument, Command, Flag } from 'effect/cli';
import { FetchHttpClient } from 'effect/http';
import { apply } from './apply.ts';
import { bake, doctor, quiesce, resume, start, state, stopApply } from './lifecycle.ts';
import { logs } from './logs.ts';
import { migrate } from './migrate.ts';
import { BoxEnv, log, Shell } from './runtime.ts';
import { ProcessCompose } from './supervisor.ts';

// The caller's GitHub token (push-capable from a laptop, the host's read-only one on Cloudflare), while the box runs
// PR code: it leaves the environment before any command runs, and only bake and apply get it, for their git fetches
// and the CI lookup.
const token = process.env.GITHUB_TOKEN ? Redacted.make(process.env.GITHUB_TOKEN) : undefined;
delete process.env.GITHUB_TOKEN;

// A failed command says why on one line and exits 1.
const reported = <A, R>(effect: Effect.Effect<A, { readonly message: string }, R>) =>
  effect.pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        log(`ERROR: ${error.message}`);
        process.exitCode = 1;
      })
    )
  );

const box = Command.make('box').pipe(
  Command.withSubcommands([
    Command.make(
      'bake',
      {
        ref: Argument.String('ref').pipe(Argument.withDefault('next')),
        start: Flag.Boolean('start').pipe(Flag.withDefault(false)),
      },
      ({ ref, start }) => reported(bake(ref, { token, start }))
    ),
    Command.make('start', {}, () => reported(start)),
    Command.make('migrate', {}, () => reported(migrate)),
    Command.make(
      'apply',
      {
        ref: Argument.String('ref').pipe(Argument.optional),
        bundle: Flag.String('bundle').pipe(Flag.optional),
        full: Flag.Boolean('full').pipe(Flag.withDefault(false)),
      },
      ({ ref, bundle, full }) =>
        reported(apply({ ref: Option.getOrUndefined(ref), bundle: Option.getOrUndefined(bundle), full, token }))
    ),
    Command.make('state', {}, () => reported(Effect.map(state, (report) => console.log(JSON.stringify(report))))),
    Command.make('doctor', {}, () => reported(doctor)),
    Command.make(
      'logs',
      {
        name: Argument.String('process').pipe(Argument.optional),
        tail: Flag.Int('tail').pipe(Flag.withDefault(200)),
        follow: Flag.Boolean('follow').pipe(Flag.withDefault(false)),
        errors: Flag.Boolean('errors').pipe(Flag.withDefault(false)),
      },
      ({ name, tail, follow, errors }) => reported(logs({ name: Option.getOrUndefined(name), tail, follow, errors }))
    ),
    Command.make('quiesce', {}, () => reported(quiesce)),
    Command.make('resume', {}, () => reported(resume)),
    Command.make('stop-apply', {}, () => reported(stopApply)),
    Command.make('status', {}, () =>
      reported(Effect.flatMap(ProcessCompose, (supervisor) => supervisor.pc(['process', 'list'])))
    ),
  ])
);

const shell = Shell.layer.pipe(Layer.provideMerge(BoxEnv.layer));
const services = ProcessCompose.layer.pipe(
  Layer.provideMerge(shell),
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provideMerge(NodeServices.layer)
);

Command.run(box, { version: '0' }).pipe(Effect.provide(services), NodeRuntime.runMain);
