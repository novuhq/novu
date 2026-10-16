// What the box's commands share: the box's environment (BoxEnv), running commands (Shell), logging and timing steps,
// waiting (poll, waitForHttp), and the JSON files under /data.

import fs from 'node:fs';
import { Context, Effect, Layer, Schedule, Schema, Stream } from 'effect';
import { HttpClient } from 'effect/http';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { parseEnvFile } from '../shared/env-file.ts';
import { BoxError, CommandFailed, TimedOut } from './errors.ts';
import { BOX, BULLMQ_PRO, DATA, REPO } from './paths.ts';

// The environment every command in the box gets: config/box.env, then the container's own. GITHUB_TOKEN stays out:
// the box runs PR code (install scripts, builds, the apps), and every child gets this environment. main.ts passes the
// token only to the git calls that need it and the CI lookup. Steps add to `vars` as the box learns them (the CA
// bundle, the S3 keys, Stripe's signing secret, BullMQ Pro).
export class BoxEnv extends Context.Service<BoxEnv, { readonly vars: Record<string, string> }>()('box/BoxEnv') {
  static readonly layer = Layer.sync(BoxEnv, () => ({ vars: loadEnv() }));
}

function loadEnv(): Record<string, string> {
  const defaults = parseEnvFile(fs.readFileSync(`${BOX}/config/box.env`, 'utf8'));
  // Production switches BullMQ to Pro (job groups) and turns off TTL indexes with this flag.
  if (fs.existsSync(`${BULLMQ_PRO}/node_modules/@taskforcesh/bullmq-pro`)) defaults.NOVU_MANAGED_SERVICE = 'true';
  const inherited = Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[0] !== 'GITHUB_TOKEN' && entry[1] !== undefined
  );

  return { ...defaults, ...Object.fromEntries(inherited) };
}

export interface RunOptions {
  readonly cwd?: string;
  readonly env?: Record<string, string>;
  readonly stdio?: 'inherit' | 'ignore';
}

// Commands run in the checkout with the box's environment unless told otherwise. They stay in our process group
// (`detached: false`): `box stop-apply` signals the apply's whole group (its setsid), and a supervisor's SIGTERM goes
// to process-compose alone, which stops its processes in order.
export class Shell extends Context.Service<
  Shell,
  {
    // Output on ours; fails unless it exits 0.
    readonly run: (
      cmd: string,
      args: ReadonlyArray<string>,
      options?: RunOptions
    ) => Effect.Effect<void, CommandFailed>;
    // Output on ours; the exit code, for commands whose code is the answer.
    readonly exitCode: (
      cmd: string,
      args: ReadonlyArray<string>,
      options?: RunOptions
    ) => Effect.Effect<number, CommandFailed>;
    // stdout, trimmed (`combined`: stdout and stderr); fails with the end of its stderr unless it exits 0.
    readonly output: (
      cmd: string,
      args: ReadonlyArray<string>,
      options?: Omit<RunOptions, 'stdio'> & { readonly combined?: boolean }
    ) => Effect.Effect<string, CommandFailed>;
    // Its exit code and output, whatever the code.
    readonly capture: (
      cmd: string,
      args: ReadonlyArray<string>,
      options?: Omit<RunOptions, 'stdio'>
    ) => Effect.Effect<{ readonly exitCode: number; readonly stdout: string; readonly stderr: string }, CommandFailed>;
  }
>()('box/Shell') {
  static readonly layer = Layer.effect(
    Shell,
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const { vars } = yield* BoxEnv;
      const command = (
        cmd: string,
        args: ReadonlyArray<string>,
        options: RunOptions,
        stdio: 'inherit' | 'ignore' | 'pipe'
      ) =>
        ChildProcess.make(cmd, args, {
          cwd: options.cwd ?? REPO,
          env: options.env ?? vars,
          extendEnv: false,
          detached: false,
          stdin: stdio === 'pipe' ? 'ignore' : stdio,
          stdout: stdio,
          stderr: stdio,
        });
      const line = (cmd: string, args: ReadonlyArray<string>) => `${cmd} ${args.join(' ')}`;
      const failed = (cmd: string, args: ReadonlyArray<string>) => (error: { message: string }) =>
        new CommandFailed({ message: `${line(cmd, args)} failed: ${error.message}`, exitCode: null });

      const exitCode = (cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}) =>
        Effect.scoped(
          Effect.flatMap(
            spawner.spawn(command(cmd, args, options, options.stdio ?? 'inherit')),
            (handle) => handle.exitCode
          )
        ).pipe(Effect.map(Number), Effect.mapError(failed(cmd, args)));

      const capture = (cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}) =>
        Effect.scoped(
          Effect.gen(function* () {
            const handle = yield* spawner.spawn(command(cmd, args, options, 'pipe'));
            const text = (stream: typeof handle.stdout) => Stream.mkString(Stream.decodeText(stream));
            const [stdout, stderr, code] = yield* Effect.all(
              [text(handle.stdout), text(handle.stderr), handle.exitCode],
              {
                concurrency: 'unbounded',
              }
            );

            return { exitCode: Number(code), stdout, stderr };
          })
        ).pipe(Effect.mapError(failed(cmd, args)));

      return Shell.of({
        exitCode,
        capture,
        run: (cmd, args, options = {}) =>
          Effect.flatMap(exitCode(cmd, args, options), (code) =>
            code === 0
              ? Effect.void
              : Effect.fail(new CommandFailed({ message: `${line(cmd, args)} exited with ${code}`, exitCode: code }))
          ),
        output: (cmd, args, { combined = false, ...options } = {}) =>
          Effect.flatMap(capture(cmd, args, options), ({ exitCode, stdout, stderr }) =>
            exitCode === 0
              ? Effect.succeed((combined ? `${stdout}\n${stderr}` : stdout).trim())
              : Effect.fail(
                  new CommandFailed({
                    message: `${line(cmd, args)} failed: ${(stderr.trim() || stdout.trim()).slice(-600)}`,
                    exitCode,
                  })
                )
          ),
      });
    })
  );
}

export function log(message: string): void {
  console.log(`[box] ${new Date().toISOString()} ${message}`);
}

// Logs a step and how long it took, also into /data/logs/timings.jsonl.
export const step = <A, E, R>(name: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    const started = Date.now();
    log(`${name}...`);
    const result = yield* effect;
    const seconds = (Date.now() - started) / 1000;
    appendTiming(name, seconds);
    log(`${name} done in ${seconds.toFixed(1)}s`);

    return result;
  });

export function appendTiming(step: string, seconds: number, command = process.argv[2]): void {
  fs.mkdirSync(`${DATA}/logs`, { recursive: true });
  fs.appendFileSync(
    `${DATA}/logs/timings.jsonl`,
    `${JSON.stringify({ at: new Date().toISOString(), command, step, seconds })}\n`
  );
}

class NotYet extends Schema.TaggedError<NotYet>()('NotYet', {}) {}

// Runs `check` until it gives something truthy, and returns that; fails with `failure` after `seconds`.
export const poll = <A, E, R>(
  seconds: number,
  check: Effect.Effect<A | null | undefined | false, E, R>,
  failure: string | (() => string),
  everyMs = 1000
): Effect.Effect<A, E | TimedOut, R> =>
  check.pipe(
    Effect.flatMap((result) => (result ? Effect.succeed(result) : Effect.fail(new NotYet()))),
    Effect.retry({ schedule: Schedule.spaced(everyMs), while: (error) => error instanceof NotYet }),
    Effect.timeoutOrElse({
      duration: seconds * 1000,
      orElse: () => Effect.fail(new TimedOut({ message: typeof failure === 'function' ? failure() : failure })),
    })
  ) as Effect.Effect<A, E | TimedOut, R>;

// The status `url` answers, or 0 when it doesn't (within 5 s).
export const httpStatus = (url: string): Effect.Effect<number, never, HttpClient.HttpClient> =>
  HttpClient.get(url).pipe(
    Effect.map((response) => response.status),
    Effect.timeout(5000),
    Effect.orElseSucceed(() => 0)
  );

export const waitForHttp = (url: string, seconds: number) =>
  poll(
    seconds,
    Effect.map(httpStatus(url), (status) => status >= 200 && status < 300),
    `${url} not healthy after ${seconds}s`
  );

// A JSON file under /data, decoded; null when it isn't there.
export const readJson = <S extends Schema.Top & { readonly DecodingServices: never }>(
  file: string,
  schema: S
): Effect.Effect<S['Type'] | null, BoxError> =>
  Effect.gen(function* () {
    if (!fs.existsSync(file)) return null;
    const text = fs.readFileSync(file, 'utf8');

    return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(text).pipe(
      Effect.mapError((error) => new BoxError({ message: `${file} isn't what the box writes: ${error.message}` }))
    );
  });

// A JSON file of the checkout's (package.json, nest-cli.json, the nx graph), as is.
// biome-ignore lint/suspicious/noExplicitAny: files of the checkout, read loosely
export function readRepoJson<A = any>(file: string): A {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as A;
}
