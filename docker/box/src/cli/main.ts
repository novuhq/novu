#!/usr/bin/env node
// Novu Box from your machine: start a box, put your checkout on it, check it, read its logs. It runs the box's own
// commands (src/box/main.ts) inside the box: a local Docker container (docker.ts), or with `--cloud` a Cloudflare
// container (cloud.ts). From docker/box, after `npm ci` once: `npm run box -- <command>`.
//
//   box up                  start the box, baking `next` first if it has never been baked;
//                           `up --cloud` without --box also puts this checkout on it (sync)
//   box sync [--full]       put this checkout, committed or not, on the box; rebuild what it changes
//   box doctor              whether the box is fit to test on, as JSON; exits 1 if not
//   box logs [process]      the last lines of one process (api, worker, bridge, …) or of all of them
//                           (--tail <n>, default 200; --follow; --errors: problems only)
//   box exec -- <cmd...>    run a command in the box's checkout (/data/novu)
//   box mail [search|id]    what the box sent (email, SMS, push, chat): the newest, a search
//                           (to:a@b.c subject:Welcome tag:sms), or one message with its HTML check
//                           and view URL (--html, --check-links, --limit <n>); see mail.ts
//   box down                stop the box; its data stays (local: its volume; cloud: its snapshot)
//   box delete --cloud      stop a Cloudflare box and delete it with its snapshot and Worker
//   box deploy              deploy the Cloudflare host, its image and the Slack router's address (alchemy.run.ts)
//
// --box <name>  local: default novu-box, its volume is <name>-data; local boxes publish the same host ports, so one
//               runs at a time. Cloud: default the current branch; the box is https://novu-box-<name>.<workers.dev>.
// --cloud       the Cloudflare box. All boxes run in one host Worker; each has its own small Worker for its address.
//               `up --cloud --deploy` redeploys the host (after a change to docker/box), which applies to every box.
//               `up --cloud --from <box>` starts a new box from that box's latest snapshot instead of baking.
//               Without --box, `up --cloud` is this branch's box: a new one starts from `base` (when it has a
//               snapshot), then gets this checkout, committed or not; `--no-sync` skips that.

import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as NodeServices from '@effect/platform-node/NodeServices';
import { Effect, Layer, Option } from 'effect';
import { Argument, Command, Flag } from 'effect/cli';
import { FetchHttpClient, type HttpClient } from 'effect/http';
import type { ChildProcessSpawner } from 'effect/process';
import { layerCloud } from './cloud.ts';
import { deployHost } from './deploy.ts';
import { layerDocker } from './docker.ts';
import { mail } from './mail.ts';
import { CliError, githubToken, log, output } from './run.ts';
import { sync } from './sync.ts';
import { BoxTarget } from './target.ts';

const root = Command.make('box').pipe(
  Command.withSharedFlags({
    box: Flag.String('box').pipe(Flag.optional),
    cloud: Flag.Boolean('cloud').pipe(Flag.withDefault(false)),
  })
);

// The current branch as a box name: lowercase letters, digits and dashes, short enough for a workers.dev name.
const branchBox = Effect.map(output('git', ['branch', '--show-current']), (branch) =>
  branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/, '')
).pipe(
  Effect.flatMap((name) =>
    name ? Effect.succeed(name) : Effect.fail(new CliError({ message: 'not on a branch; pass --box <name>' }))
  )
);

type Services = HttpClient.HttpClient | ChildProcessSpawner.ChildProcessSpawner;

// Runs a command against the box --box and --cloud name; its result is the exit code, and a failure says why on one
// line and exits 1.
const onBox = <R extends BoxTarget | Services>(
  body: (own: { readonly ownBox: boolean }) => Effect.Effect<number, CliError, R>
) =>
  Effect.gen(function* () {
    const { box, cloud } = yield* root;
    const name = Option.isSome(box) ? box.value : cloud ? yield* branchBox : 'novu-box';
    const spawner = yield* Effect.context<ChildProcessSpawner.ChildProcessSpawner>();
    const token = yield* Effect.cached(Effect.provide(githubToken, spawner));
    const target = cloud ? layerCloud({ box: name, token }) : layerDocker(name);
    process.exitCode = yield* body({ ownBox: cloud && Option.isNone(box) }).pipe(Effect.provide(target));
  }).pipe(
    Effect.catchTag('CliError', (error) =>
      Effect.sync(() => {
        log(`ERROR: ${error.message}`);
        process.exitCode = 1;
      })
    )
  );

// Flags that mean something only for a Cloudflare box.
const cloudOnly = (flags: Record<string, boolean>) =>
  Effect.flatMap(root, ({ cloud }) => {
    const set = Object.keys(flags).filter((name) => flags[name]);
    if (!set.length || cloud) return Effect.void;

    return Effect.sync(() => {
      console.error(`${set.map((name) => `--${name}`).join(', ')}: only with --cloud`);
      process.exit(2);
    });
  });

const up = Command.make(
  'up',
  {
    deploy: Flag.Boolean('deploy').pipe(Flag.withDefault(false)),
    from: Flag.String('from').pipe(Flag.optional),
    noSync: Flag.Boolean('no-sync').pipe(Flag.withDefault(false)),
  },
  ({ deploy, from, noSync }) =>
    Effect.andThen(
      cloudOnly({ deploy, from: Option.isSome(from), 'no-sync': noSync }),
      onBox(({ ownBox }) =>
        Effect.gen(function* () {
          const target = yield* BoxTarget;
          // The branch's own box (no --box) is for this checkout: start it from base and put the checkout on it.
          const code = yield* target.up({ deploy, from: Option.getOrUndefined(from), fromBase: ownBox });

          return code === 0 && ownBox && !noSync ? yield* sync({ full: false }) : code;
        })
      )
    )
).pipe(Command.withDescription('start the box (baking next the first time); --cloud without --box also syncs'));

const syncCommand = Command.make('sync', { full: Flag.Boolean('full').pipe(Flag.withDefault(false)) }, ({ full }) =>
  onBox(() => sync({ full }))
).pipe(Command.withDescription('put this checkout, committed or not, on the box; rebuild what it changes'));

const doctor = Command.make('doctor', {}, () =>
  onBox(() => Effect.flatMap(BoxTarget, (target) => Effect.andThen(target.ready, target.box(['doctor']))))
).pipe(Command.withDescription('whether the box is fit to test on, as JSON; exits 1 if not'));

const logs = Command.make(
  'logs',
  {
    process: Argument.String('process').pipe(Argument.optional),
    tail: Flag.Int('tail').pipe(Flag.withDefault(200)),
    follow: Flag.Boolean('follow').pipe(Flag.withDefault(false)),
    errors: Flag.Boolean('errors').pipe(Flag.withDefault(false)),
  },
  ({ process: name, tail, follow, errors }) =>
    onBox(() =>
      Effect.flatMap(BoxTarget, (target) =>
        Effect.andThen(
          target.ready,
          target.box([
            'logs',
            ...Option.toArray(name),
            '--tail',
            String(tail),
            ...(follow ? ['--follow'] : []),
            ...(errors ? ['--errors'] : []),
          ])
        )
      )
    )
).pipe(Command.withDescription('the last lines of one process, or of all of them'));

const exec = Command.make('exec', { command: Argument.String('command').pipe(Argument.variadic()) }, ({ command }) =>
  onBox(() =>
    command.length
      ? Effect.flatMap(BoxTarget, (target) => Effect.andThen(target.ready, target.exec(command)))
      : Effect.fail(new CliError({ message: 'usage: box exec -- <command...>' }))
  )
).pipe(Command.withDescription("run a command in the box's checkout (/data/novu): exec -- <cmd...>"));

const mailCommand = Command.make(
  'mail',
  {
    query: Argument.String('search|id').pipe(Argument.variadic()),
    limit: Flag.Int('limit').pipe(Flag.withDefault(20)),
    html: Flag.Boolean('html').pipe(Flag.withDefault(false)),
    checkLinks: Flag.Boolean('check-links').pipe(Flag.withDefault(false)),
  },
  ({ query, limit, html, checkLinks }) =>
    onBox(() =>
      Effect.gen(function* () {
        const target = yield* BoxTarget;
        yield* target.ready;

        return yield* mail({ mailUrl: target.mailUrl, args: query, limit, html, checkLinks });
      })
    )
).pipe(Command.withDescription('what the box sent (email, SMS, push, chat)'));

const down = Command.make('down', {}, () => onBox(() => Effect.flatMap(BoxTarget, (target) => target.down))).pipe(
  Command.withDescription('stop the box; its data stays (local: its volume; cloud: its snapshot)')
);

const deleteCommand = Command.make('delete', {}, () =>
  onBox(() => Effect.flatMap(BoxTarget, (target) => target.delete))
).pipe(Command.withDescription('stop a Cloudflare box and delete it with its snapshot and Worker'));

const deploy = Command.make('deploy', {}, () => onBox(() => Effect.as(deployHost, 0))).pipe(
  Command.withDescription("deploy the Cloudflare host, its image and the Slack router's address")
);

const cli = root.pipe(
  Command.withSubcommands([up, syncCommand, doctor, logs, exec, mailCommand, down, deleteCommand, deploy])
);

Command.run(cli, { version: '0' }).pipe(
  Effect.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer)),
  NodeRuntime.runMain
);
