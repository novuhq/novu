// process-compose, the box's supervisor: starting it, asking it for its processes, starting and stopping them.

import { Context, Effect, Layer, Schema, type Scope } from 'effect';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { BoxError, type CommandFailed, type TimedOut } from './errors.ts';
import { BOX, PC_SOCKET, RUN } from './paths.ts';
import { STORES } from './processes.ts';
import { BoxEnv, poll, Shell, step } from './runtime.ts';

// One row of `process-compose process list -o json`.
export const PcProcess = Schema.Struct({
  name: Schema.String,
  status: Schema.String,
  is_ready: Schema.String,
  is_running: Schema.Boolean,
  exit_code: Schema.Number,
  restarts: Schema.Number,
});
export type PcProcess = typeof PcProcess.Type;

const socket = ['--use-uds', '--unix-socket', PC_SOCKET];

export class ProcessCompose extends Context.Service<
  ProcessCompose,
  {
    readonly pc: (args: ReadonlyArray<string>) => Effect.Effect<void, CommandFailed>;
    readonly list: Effect.Effect<ReadonlyArray<PcProcess>, CommandFailed | BoxError>;
    readonly running: Effect.Effect<Set<string>, CommandFailed | BoxError>;
    // Stops those of `names` that run, and waits until they have.
    readonly stopRunning: (names: ReadonlyArray<string>) => Effect.Effect<void, CommandFailed | BoxError | TimedOut>;
    // Every store answers its readiness probe and `migrate` has run: what the apps, and an apply, need first.
    readonly storesReady: Effect.Effect<boolean, CommandFailed | BoxError>;
    // `process-compose up` with the box's environment as it is now, for the rest of the scope.
    readonly up: Effect.Effect<ChildProcessSpawner.ChildProcessHandle, BoxError, Scope.Scope>;
  }
>()('box/ProcessCompose') {
  static readonly layer = Layer.effect(
    ProcessCompose,
    Effect.gen(function* () {
      const shell = yield* Shell;
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const { vars } = yield* BoxEnv;
      const pc = (args: ReadonlyArray<string>) => shell.run('process-compose', [...args, ...socket], { cwd: RUN });
      const list = shell.output('process-compose', ['process', 'list', '-o', 'json', ...socket], { cwd: RUN }).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(PcProcess)))),
        Effect.mapError((error) =>
          error._tag === 'CommandFailed' ? error : new BoxError({ message: `process-compose's list: ${error.message}` })
        )
      );
      const running = Effect.map(list, (rows) => new Set(rows.filter((row) => row.is_running).map((row) => row.name)));

      // process-compose fails to stop a process that isn't running (a failed apply leaves apps stopped), and
      // `process stop` returns while they still terminate.
      const stopRunning = (names: ReadonlyArray<string>) =>
        Effect.gen(function* () {
          const now = yield* running;
          const stop = names.filter((name) => now.has(name));
          if (stop.length) yield* step(`stop ${stop.join(' ')}`, pc(['process', 'stop', ...stop]));
          let left: Array<string> = [];
          yield* poll(
            180,
            Effect.map(list, (rows) => {
              left = rows
                .filter((row) => names.includes(row.name) && (row.is_running || row.status === 'Terminating'))
                .map((row) => row.name);

              return !left.length;
            }),
            () => `still running 180s after the stop: ${left.join(' ')}`
          );
        });

      const storesReady = Effect.map(list, (rows) => {
        const ready = STORES.every((name) => rows.find((row) => row.name === name)?.is_ready === 'Ready');

        return ready && rows.find((row) => row.name === 'migrate')?.status === 'Completed';
      });

      const up = spawner
        .spawn(
          ChildProcess.make(
            'process-compose',
            ['up', '--tui=false', '--keep-project', '--config', `${BOX}/process-compose.yaml`, ...socket],
            {
              cwd: RUN,
              env: vars,
              extendEnv: false,
              detached: false,
              stdin: 'inherit',
              stdout: 'inherit',
              stderr: 'inherit',
            }
          )
        )
        .pipe(Effect.mapError((error) => new BoxError({ message: `process-compose up: ${error.message}` })));

      return ProcessCompose.of({ pc, list, running, stopRunning, storesReady, up });
    })
  );
}
