// The local box: a Docker container with its data in a named volume. Local boxes publish the same host ports, so one
// runs at a time.

import fs from 'node:fs';
import { join } from 'node:path';
import { Effect, Layer, Schema } from 'effect';
import { ChildProcessSpawner } from 'effect/process';
import { DoctorReport } from '../shared/contracts.ts';
import { BOX_CLI } from '../shared/names.ts';
import { CliError, capture, exitCode, githubToken, log, output, type RunOptions, run, succeeds } from './run.ts';
import { BoxTarget, type Target } from './target.ts';

export const HERE = new URL('../..', import.meta.url).pathname;
// Not novu-box:dev, the tag checkouts on the old box.mjs image build: the entrypoint changed.
const IMAGE = 'novu-box:local';
const ENV_FILE = join(HERE, '.env');
const PORTS = { api: 13000, dashboard: 14200, socket: 18887, s3: 4566, mailpit: 18025 };
const PORT_FLAGS = ['13000:3000', '14200:4200', '18887:8887', '4566:4566', '18025:8025'].flatMap((map) => ['-p', map]);
const HEALTHY_WITHIN_SECONDS = 240;
// process-compose stops the apps, then the stores, each with its own timeout (image/process-compose.yaml); Docker's
// default 10 s would kill it halfway, and Redis (appendonly no) would lose what it hadn't saved.
const STOP_SECONDS = 180;

const decodeDoctor = Schema.decodeUnknownEffect(Schema.fromJsonString(DoctorReport));

const dockerTarget = (box: string) =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const provide = <A, E>(effect: Effect.Effect<A, E, ChildProcessSpawner.ChildProcessSpawner>) =>
      Effect.provideService(effect, ChildProcessSpawner.ChildProcessSpawner, spawner);

    const containerStatus = output('docker', ['inspect', '--format', '{{.State.Status}}', box]).pipe(
      Effect.orElseSucceed(() => null)
    );

    const requireRunning = Effect.flatMap(containerStatus, (status) =>
      status === 'running'
        ? Effect.void
        : Effect.fail(new CliError({ message: `box ${box} is ${status ?? 'not created'}; run \`box up\` first` }))
    );

    // Its exit code is the box's; the GitHub token reaches only this command.
    const inBox = (args: ReadonlyArray<string>, github: boolean) =>
      Effect.map(
        github ? githubToken : Effect.succeed(undefined),
        (token): { args: Array<string>; options: RunOptions } => ({
          args: ['exec', ...(token ? ['-e', 'GITHUB_TOKEN'] : []), box, ...BOX_CLI, ...args],
          options: token ? { env: { ...process.env, GITHUB_TOKEN: token } } : {},
        })
      );

    // The doctor prints its report whether or not it passes; null while the box can't give one (starting).
    const doctorReport = capture('docker', ['exec', box, ...BOX_CLI, 'doctor']).pipe(
      Effect.flatMap(({ stdout }) => decodeDoctor(stdout)),
      Effect.orElseSucceed(() => null)
    );

    const waitUntilHealthy = Effect.gen(function* () {
      const deadline = Date.now() + HEALTHY_WITHIN_SECONDS * 1000;
      let report: DoctorReport | null = null;
      while (Date.now() < deadline) {
        report = yield* doctorReport;
        if (report?.ok) {
          log(`${box} is healthy`);

          return;
        }
        yield* Effect.sleep('3 seconds');
      }

      return yield* new CliError({
        message: `${box} isn't healthy after ${HEALTHY_WITHIN_SECONDS}s: ${report?.problems.join('; ') ?? 'no report'}`,
      });
    });

    const create = Effect.gen(function* () {
      if (!fs.existsSync(ENV_FILE))
        return yield* new CliError({
          message: `${ENV_FILE} is missing; copy secrets.example.env there and fill it in`,
        });
      if (!(yield* succeeds('docker', ['image', 'inspect', IMAGE]))) {
        log(`building ${IMAGE}`);
        yield* run('docker', ['build', '-t', IMAGE, '-f', join(HERE, 'image/Dockerfile'), HERE]).pipe(
          Effect.mapError(() => new CliError({ message: 'the image build failed' }))
        );
      }
      const volume = `${box}-data`;
      const volumeArgs = ['-v', `${volume}:/data`];
      if (
        !(yield* succeeds('docker', [
          'run',
          '--rm',
          ...volumeArgs,
          '--entrypoint',
          'test',
          IMAGE,
          '-f',
          '/data/.baked.json',
        ]))
      ) {
        log(`baking next into ${volume} (about 12 minutes)`);
        const token = yield* githubToken;
        const baked = yield* exitCode(
          'docker',
          [
            'run',
            '--rm',
            '--name',
            `${box}-bake`,
            '-e',
            'GITHUB_TOKEN',
            '--env-file',
            ENV_FILE,
            ...volumeArgs,
            IMAGE,
            'bake',
            'next',
          ],
          { env: { ...process.env, GITHUB_TOKEN: token } }
        );
        if (baked !== 0)
          return yield* new CliError({
            message: `the bake failed; its log is above, and the volume ${volume} keeps what it got to`,
          });
      }
      log(`creating ${box}`);
      yield* output('docker', [
        'run',
        '-d',
        '--name',
        box,
        '--stop-timeout',
        String(STOP_SECONDS),
        '--env-file',
        ENV_FILE,
        ...volumeArgs,
        ...PORT_FLAGS,
        IMAGE,
      ]);
    });

    const target: Target = {
      name: box,
      mailUrl: `http://localhost:${PORTS.mailpit}/mail`,
      up: () =>
        provide(
          Effect.gen(function* () {
            const status = yield* containerStatus;
            if (status === 'running') log(`${box} is already running`);
            else if (status) {
              log(`starting ${box}`);
              yield* exitCode('docker', ['start', box]);
            } else yield* create;
            yield* waitUntilHealthy;
            console.log(`dashboard: http://localhost:${PORTS.dashboard}`);
            console.log(`api: http://localhost:${PORTS.api}`);
            console.log(`mailpit: http://localhost:${PORTS.mailpit}/mail`);

            return 0;
          })
        ),
      down: provide(
        Effect.suspend(() => {
          log(`stopping ${box}; \`box up\` starts it again with the same data`);

          return exitCode('docker', ['stop', '-t', String(STOP_SECONDS), box]);
        })
      ),
      delete: Effect.fail(
        new CliError({ message: 'delete is for Cloudflare boxes (--cloud); a local box is its volume' })
      ),
      ready: provide(requireRunning),
      box: (args, { github = false } = {}) =>
        provide(Effect.flatMap(inBox(args, github), (call) => exitCode('docker', call.args, call.options))),
      boxOutput: (args, { github = false } = {}) =>
        provide(Effect.flatMap(inBox(args, github), (call) => output('docker', call.args, call.options))),
      exec: (cmd) =>
        provide(
          exitCode('docker', ['exec', ...(process.stdin.isTTY ? ['-it'] : ['-i']), '-w', '/data/novu', box, ...cmd])
        ),
      put: (file, path) => provide(Effect.asVoid(output('docker', ['cp', file, `${box}:${path}`]))),
    };

    return target;
  });

export const layerDocker = (box: string) => Layer.effect(BoxTarget, dockerTarget(box));
