// The local box: a Docker container with its data in a named volume. Local boxes publish the same host ports, so one
// runs at a time.

import fs from 'node:fs';
import { join } from 'node:path';
import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import { capture, exitCode, output, type RunOptions, run } from '../node/process.ts';
import { DoctorReport, fromJson } from '../shared/contracts.ts';
import { BOX_CLI } from '../shared/names.ts';
import { githubToken, type Target } from './target.ts';

export const HERE = new URL('../..', import.meta.url).pathname;
// Not novu-box:dev, the tag checkouts on the old box.mjs image build: the entrypoint changed.
const IMAGE = 'novu-box:local';
const ENV_FILE = join(HERE, '.env');
const PORTS = { api: 13000, dashboard: 14200, socket: 18887, s3: 4566, mailpit: 18025 };
const PORT_FLAGS = ['13000:3000', '14200:4200', '18887:8887', '4566:4566', '18025:8025'].flatMap((map) => ['-p', map]);
const HEALTHY_WITHIN_MS = 240_000;
// process-compose stops the apps, then the stores, each with its own timeout (image/process-compose.yaml); Docker's
// default 10 s would kill it halfway, and Redis (appendonly no) would lose what it hadn't saved.
const STOP_SECONDS = 180;

const succeeds = async (args: ReadonlyArray<string>) =>
  (await exitCode('docker', args, { stdio: 'ignore' }).catch(() => 1)) === 0;

export function dockerTarget(box: string): Target {
  const volumeArgs = ['-v', `${box}-data:/data`];

  const containerStatus = () => output('docker', ['inspect', '--format', '{{.State.Status}}', box]).catch(() => null);

  const requireRunning = async () => {
    const status = await containerStatus();
    if (status !== 'running') throw new Error(`box ${box} is ${status ?? 'not created'}; run \`box up\` first`);
  };

  // Its exit code is the box's; the GitHub token reaches only this command.
  const inBox = async (args: ReadonlyArray<string>, github = false) => {
    const token = github ? await githubToken() : undefined;
    const options: RunOptions = token ? { env: { ...process.env, GITHUB_TOKEN: token } } : {};

    return { args: ['exec', ...(token ? ['-e', 'GITHUB_TOKEN'] : []), box, ...BOX_CLI, ...args], options };
  };

  // The doctor prints its report whether or not it passes; null while the box can't give one (starting).
  const doctorReport = async () => {
    const { stdout } = await capture('docker', ['exec', box, ...BOX_CLI, 'doctor']).catch(() => ({ stdout: '' }));

    return fromJson(DoctorReport).safeParse(stdout).data ?? null;
  };

  const waitUntilHealthy = async () => {
    let report: DoctorReport | null = null;
    const healthy = async () => {
      report = await doctorReport();

      return report?.ok;
    };
    await poll(healthy, {
      timeoutMs: HEALTHY_WITHIN_MS,
      everyMs: 3000,
      orElse: () => {
        throw new Error(
          `${box} isn't healthy after ${HEALTHY_WITHIN_MS / 1000}s: ${report?.problems.join('; ') ?? 'no report'}`
        );
      },
    });
    log(`${box} is healthy`);
  };

  const bake = async () => {
    log(`baking next into ${box}-data (about 12 minutes)`);
    const env = { ...process.env, GITHUB_TOKEN: await githubToken() };
    const name = ['--name', `${box}-bake`, '-e', 'GITHUB_TOKEN', '--env-file', ENV_FILE];
    if ((await exitCode('docker', ['run', '--rm', ...name, ...volumeArgs, IMAGE, 'bake', 'next'], { env })) !== 0)
      throw new Error(`the bake failed; its log is above, and the volume ${box}-data keeps what it got to`);
  };

  const create = async () => {
    if (!fs.existsSync(ENV_FILE))
      throw new Error(`${ENV_FILE} is missing; copy secrets.example.env there and fill it in`);
    if (!(await succeeds(['image', 'inspect', IMAGE]))) {
      log(`building ${IMAGE}`);
      await run('docker', ['build', '-t', IMAGE, '-f', join(HERE, 'image/Dockerfile'), HERE]).catch(() => {
        throw new Error('the image build failed');
      });
    }
    if (!(await succeeds(['run', '--rm', ...volumeArgs, '--entrypoint', 'test', IMAGE, '-f', '/data/.baked.json'])))
      await bake();
    log(`creating ${box}`);
    const stop = ['--stop-timeout', String(STOP_SECONDS)];
    await output('docker', [
      'run',
      '-d',
      '--name',
      box,
      ...stop,
      '--env-file',
      ENV_FILE,
      ...volumeArgs,
      ...PORT_FLAGS,
      IMAGE,
    ]);
  };

  return {
    name: box,
    mailUrl: `http://localhost:${PORTS.mailpit}/mail`,
    async up() {
      const status = await containerStatus();
      if (status === 'running') log(`${box} is already running`);
      else if (status) {
        log(`starting ${box}`);
        await exitCode('docker', ['start', box]);
      } else await create();
      await waitUntilHealthy();
      console.log(`dashboard: http://localhost:${PORTS.dashboard}`);
      console.log(`api: http://localhost:${PORTS.api}`);
      console.log(`mailpit: http://localhost:${PORTS.mailpit}/mail`);

      return 0;
    },
    down() {
      log(`stopping ${box}; \`box up\` starts it again with the same data`);

      return exitCode('docker', ['stop', '-t', String(STOP_SECONDS), box]);
    },
    delete: () => Promise.reject(new Error('delete is for Cloudflare boxes (--cloud); a local box is its volume')),
    ready: requireRunning,
    async box(args, { github } = {}) {
      const call = await inBox(args, github);

      return exitCode('docker', call.args, call.options);
    },
    async boxOutput(args, { github } = {}) {
      const call = await inBox(args, github);

      return output('docker', call.args, call.options);
    },
    exec: (cmd) =>
      exitCode('docker', ['exec', ...(process.stdin.isTTY ? ['-it'] : ['-i']), '-w', '/data/novu', box, ...cmd], {
        interactive: true,
      }),
    put: async (file, path) => {
      await output('docker', ['cp', file, `${box}:${path}`]);
    },
  };
}
