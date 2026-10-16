// What the CLI and CI share on your machine or a runner: their one error, their log line, child processes and the
// caller's GitHub token.

import { Data, type Duration, Effect, Schedule, Schema, Stream } from 'effect';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';

export class CliError extends Schema.TaggedError<CliError>()('CliError', {
  message: Schema.String,
  // The box file with the log of what failed (CI's apply), for the PR comment.
  log: Schema.optional(Schema.String),
}) {}

export function log(message: string): void {
  console.error(`[cli] ${message}`);
}

class NotYet extends Data.TaggedError('NotYet') {}

// Runs `check` every `every` until it gives a value, or else once `until` (ms since the epoch) has passed: then
// `orElse`. A check that fails ends the wait.
export const pollUntil = <A, E, R>(
  check: Effect.Effect<A | undefined, E, R>,
  {
    every,
    until,
    orElse,
  }: { readonly every: Duration.Input; readonly until: number; readonly orElse: Effect.Effect<A, E, R> }
): Effect.Effect<A, E, R> =>
  check.pipe(
    Effect.flatMap((value) => (value === undefined ? Effect.fail(new NotYet()) : Effect.succeed(value))),
    Effect.retry({
      while: (error) => error instanceof NotYet && Date.now() <= until,
      schedule: Schedule.spaced(every),
    }),
    Effect.catchIf(
      (error): error is NotYet => error instanceof NotYet,
      () => orElse
    )
  );

export interface RunOptions {
  readonly cwd?: string;
  readonly env?: Record<string, string | undefined>;
  // Written to the command's stdin.
  readonly input?: string;
}

const command = (cmd: string, args: ReadonlyArray<string>, options: RunOptions, stdio: 'inherit' | 'pipe') =>
  ChildProcess.make(cmd, args, {
    ...(options.cwd && { cwd: options.cwd }),
    ...(options.env && { env: options.env, extendEnv: false }),
    detached: false,
    stdin: options.input === undefined ? stdio : Stream.make(new TextEncoder().encode(options.input)),
    stdout: stdio,
    stderr: stdio,
  });

const failed = (cmd: string, args: ReadonlyArray<string>) => (error: { readonly message: string }) =>
  new CliError({ message: `${cmd} ${args.join(' ')}: ${error.message}` });

// Runs a command with its output on ours and returns its exit code, for commands whose code is the answer.
export const exitCode = (cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}) =>
  Effect.flatMap(ChildProcessSpawner.ChildProcessSpawner, (spawner) =>
    spawner.exitCode(command(cmd, args, options, 'inherit'))
  ).pipe(Effect.map(Number), Effect.mapError(failed(cmd, args)));

// Runs a command with its output on ours; fails unless it exits 0.
export const run = (cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}) =>
  Effect.flatMap(exitCode(cmd, args, options), (code) =>
    code === 0 ? Effect.void : Effect.fail(new CliError({ message: `${cmd} ${args.join(' ')} exited with ${code}` }))
  );

// A command's exit code and output, whatever the code.
export const capture = (cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}) =>
  Effect.flatMap(ChildProcessSpawner.ChildProcessSpawner, (spawner) =>
    Effect.scoped(
      Effect.gen(function* () {
        const handle = yield* spawner.spawn(command(cmd, args, options, 'pipe'));
        const text = (stream: typeof handle.stdout) => Stream.mkString(Stream.decodeText(stream));
        const [code, stdout, stderr] = yield* Effect.all([handle.exitCode, text(handle.stdout), text(handle.stderr)], {
          concurrency: 'unbounded',
        });

        return { exitCode: Number(code), stdout, stderr };
      })
    )
  ).pipe(Effect.mapError(failed(cmd, args)));

// A command's stdout, trimmed; fails with its stderr unless it exits 0. `combined`: stdout and stderr together.
export const output = Effect.fn('output')(function* (
  cmd: string,
  args: ReadonlyArray<string>,
  { combined = false, ...options }: RunOptions & { readonly combined?: boolean } = {}
) {
  const { exitCode: code, stdout, stderr } = yield* capture(cmd, args, options);
  if (code !== 0)
    return yield* new CliError({
      message: `${cmd} ${args.join(' ')} failed: ${(stderr.trim() || stdout.trim()).slice(-600)}`,
    });

  return (combined ? `${stdout}\n${stderr}` : stdout).trim();
});

// Whether a command exits 0, its output unseen.
export const succeeds = (cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}) =>
  Effect.flatMap(ChildProcessSpawner.ChildProcessSpawner, (spawner) =>
    spawner.exitCode(
      ChildProcess.make(cmd, args, {
        ...(options.cwd && { cwd: options.cwd }),
        detached: false,
        stdin: 'ignore',
        stdout: 'ignore',
        stderr: 'ignore',
      })
    )
  ).pipe(
    Effect.map((code) => Number(code) === 0),
    Effect.orElseSucceed(() => false)
  );

// The caller's GitHub token: GITHUB_TOKEN, else `gh auth token`.
export const githubToken = Effect.suspend(() =>
  process.env.GITHUB_TOKEN
    ? Effect.succeed(process.env.GITHUB_TOKEN)
    : output('gh', ['auth', 'token']).pipe(
        Effect.mapError(() => new CliError({ message: 'needs GITHUB_TOKEN or a signed-in `gh` (gh auth login)' }))
      )
);
