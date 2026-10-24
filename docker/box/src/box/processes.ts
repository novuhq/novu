import { REDIS_PORTS } from './paths.ts';

interface ProcessEntry {
  readonly kind: 'store' | 'app';
  readonly projects?: ReadonlyArray<string>;
  readonly paths?: ReadonlyArray<string>;
  readonly deploy?: string;
}

export const PROCESSES: Readonly<Record<string, ProcessEntry>> = {
  mongo: { kind: 'store' },
  ...Object.fromEntries(REDIS_PORTS.map((port) => [`redis-${port}`, { kind: 'store' } as const])),
  clickhouse: { kind: 'store' },
  s3: { kind: 'store' },
  sqs: { kind: 'store' },
  mail: { kind: 'store' },
  sink: { kind: 'app' },
  migrate: { kind: 'app' },
  api: { kind: 'app', projects: ['@novu/api-service'], deploy: '@novu/api-service' },
  worker: { kind: 'app', projects: ['@novu/worker'], deploy: '@novu/worker' },
  socket: { kind: 'app', paths: ['enterprise/workers/socket/'] },
  dashboard: { kind: 'app', projects: ['@novu/dashboard'] },
  stripe: { kind: 'app' },
  bridge: { kind: 'app', projects: ['@novu/framework', '@novu/agent-toolkit'], paths: ['playground/nextjs/'] },
  thalamus: { kind: 'app', paths: ['enterprise/workers/thalamus-observer/'] },
};

const entries = Object.entries(PROCESSES);
const processesWhere = (test: (entry: ProcessEntry) => boolean) =>
  entries.filter(([, entry]) => test(entry)).map(([name]) => name);

export const STORES = processesWhere((entry) => entry.kind === 'store');
export const APPS = processesWhere((entry) => entry.kind === 'app');
export const CODE_PROCESSES = processesWhere((entry) => Boolean(entry.projects || entry.paths));
export const PROJECT_PROCESSES: Readonly<Record<string, string>> = Object.fromEntries(
  entries.flatMap(([name, entry]) => (entry.projects ?? []).map((project) => [project, name]))
);
export const PATH_PROCESSES: Readonly<Record<string, string>> = Object.fromEntries(
  entries.flatMap(([name, entry]) => (entry.paths ?? []).map((path) => [path, name]))
);
export const DEPLOYED_APPS: Readonly<Record<string, string>> = Object.fromEntries(
  entries.flatMap(([name, entry]) => (entry.deploy ? [[name, entry.deploy]] : []))
);
// A dependency change always changes the lockfile (installs are frozen); the deploy refresh copies a changed
// package.json.
export const INSTALL_FILES = ['pnpm-lock.yaml', 'pnpm-workspace.yaml', '.source'];
