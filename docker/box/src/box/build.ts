// Installing, building and deploying the checkout's apps, which bake and apply share, and the dashboard's runtime
// copy, which start prepares too.

import fs from 'node:fs';
import { relative } from 'node:path';
import { Effect } from 'effect';
import { Applied, Baked } from '../shared/contracts.ts';
import { BoxError } from './errors.ts';
import { APPLIED, BAKED, BULLMQ_PRO, DATA, DEPLOY, NX, REPO, RUN } from './paths.ts';
import { DEPLOYED_APPS } from './processes.ts';
import { BoxEnv, readJson, readRepoJson, Shell } from './runtime.ts';

export const pnpmInstall = Effect.gen(function* () {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  yield* shell.run('pnpm', ['install', '--frozen-lockfile', '--store-dir', `${DATA}/pnpm-store`], {
    env: { ...vars, NODE_OPTIONS: '', CI: 'true', HUSKY: '0', CYPRESS_INSTALL_BINARY: '0' },
  });
  yield* shell.run('pnpm', ['symlink:submodules']);
});

interface ProjectGraph {
  readonly nodes: Record<
    string,
    { readonly data: { readonly root: string; readonly targets?: Record<string, unknown> } }
  >;
  readonly dependencies: Record<string, ReadonlyArray<{ readonly target: string }>>;
}

const projectGraph = Effect.gen(function* () {
  const shell = yield* Shell;
  const file = `${RUN}/nx-graph.json`;
  fs.mkdirSync(RUN, { recursive: true });
  yield* shell.output(NX, ['graph', `--file=${file}`]);

  return readRepoJson<{ graph: ProjectGraph }>(file).graph;
});

// The API, the worker and the dashboard build in their own runs to get their own arguments (`--sourcemap false` takes
// vite's peak from ~4 GB to ~2.5 GB). Their dependencies build once, in the first run. nx can't hash the enterprise
// packages (their src links into the nxignored submodule), so it rebuilds them every time (~25 s); without
// `enterprise` they are left out and their last dist is reused.
// Libraries first, 4 at a time (the box has 4 vCPUs; peak memory measured 4.2 of 12 GiB). Then the worker, and the
// API's metadata and build, at the same time.
export const build = Effect.fn('build')(function* (projects: ReadonlyArray<string>, { enterprise = true } = {}) {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  const nxEnv = { env: { ...vars, NODE_OPTIONS: '' } };
  const nx = (args: ReadonlyArray<string>) => shell.run(NX, args, nxEnv);
  const graph = yield* projectGraph;
  const own = ['@novu/api-service', '@novu/worker', '@novu/dashboard'].filter((project) => projects.includes(project));
  const first = new Set(projects.filter((project) => !own.includes(project)));
  for (const project of own) {
    const root = graph.nodes[project]?.data.root;
    if (root === undefined) continue;
    const { devDependencies = {} } = readRepoJson<{ devDependencies?: Record<string, string> }>(
      `${REPO}/${root}/package.json`
    );
    for (const { target } of graph.dependencies[project] ?? [])
      if (graph.nodes[target] && !(target in devDependencies)) first.add(target);
  }
  const closure = new Set<string>();
  const visit = (project: string) => {
    if (closure.has(project) || !graph.nodes[project]) return;
    closure.add(project);
    for (const { target } of graph.dependencies[project] ?? []) visit(target);
  };
  for (const project of first) visit(project);
  const libs = [...closure].filter((project) => {
    const node = graph.nodes[project];

    return Boolean(node?.data.targets?.build) && (enterprise || !node?.data.root.startsWith('enterprise/packages/'));
  });
  if (libs.length)
    yield* nx(['run-many', '-t', 'build', `--projects=${libs.join(',')}`, '--excludeTaskDependencies', '--parallel=4']);
  const apps: Array<ReturnType<typeof nx>> = [];
  if (own.includes('@novu/worker'))
    apps.push(
      nx(['run', '@novu/worker:build', '--excludeTaskDependencies', '--', '-c', nestConfigWithoutTypeCheck('worker')])
    );
  if (own.includes('@novu/api-service'))
    apps.push(
      Effect.andThen(
        nx(['run', '@novu/api-service:build-metadata', '--excludeTaskDependencies']),
        nx([
          'run',
          '@novu/api-service:build',
          '--excludeTaskDependencies',
          '--',
          '-c',
          nestConfigWithoutTypeCheck('api'),
        ])
      )
    );
  yield* Effect.all(apps, { concurrency: 'unbounded', discard: true });
  if (own.includes('@novu/dashboard'))
    yield* nx(['run', '@novu/dashboard:build', '--excludeTaskDependencies', '--', '--sourcemap', 'false']);
});

// An app's nest-cli.json without `typeCheck`: the same swc output without a full type-check (API ~6 s instead of
// ~57 s, worker ~4 s instead of ~14 s). CI's build type-checks every PR.
function nestConfigWithoutTypeCheck(app: string): string {
  const config = readRepoJson(`${REPO}/apps/${app}/nest-cli.json`);
  config.compilerOptions.typeCheck = false;
  fs.mkdirSync(RUN, { recursive: true });
  fs.writeFileSync(`${RUN}/${app}-nest-cli.json`, JSON.stringify(config));

  return relative(`${REPO}/apps/${app}`, `${RUN}/${app}-nest-cli.json`);
}

// `compile` mode skips the type check and the static prerender, which the playground doesn't pass; every page
// renders on request, as under `next dev`. Turbopack takes ~45 s and ~2.4 GB, webpack ~110 s.
export const buildBridge = Effect.gen(function* () {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  yield* shell.run('node_modules/.bin/next', ['build', '--turbopack', '--experimental-build-mode', 'compile'], {
    cwd: `${REPO}/playground/nextjs`,
    env: { ...vars, NODE_OPTIONS: '', NEXT_TELEMETRY_DISABLED: '1' },
  });
});

export const workspacePackages = Effect.gen(function* () {
  const shell = yield* Shell;
  const list = JSON.parse(yield* shell.output('pnpm', ['-s', 'ls', '-r', '--depth', '-1', '--json'])) as Array<{
    name: string;
    path: string;
  }>;

  return new Map(list.map((pkg) => [pkg.name, pkg.path]));
});

// nx counts devDependencies as build inputs, so the dashboard's test-only helpers (@novu/dal, @novu/ee-auth) make
// every backend change rebuild it. Its bundle reads apps/dashboard, its runtime dependencies, and everything those
// depend on, devDependencies included (libraries bundle some of theirs).
export const dashboardBundleChanged = Effect.fn('dashboardBundleChanged')(function* (files: ReadonlyArray<string>) {
  const workspace = yield* workspacePackages;
  const dirs = new Set<string>();
  const visit = (name: string, isDashboard = false) => {
    const dir = workspace.get(name);
    if (!dir || dirs.has(dir)) return;
    dirs.add(dir);
    const pkg = readRepoJson<{ dependencies?: object; devDependencies?: object }>(`${dir}/package.json`);
    for (const dep of Object.keys({ ...pkg.dependencies, ...(isDashboard ? {} : pkg.devDependencies) })) visit(dep);
  };
  visit('@novu/dashboard', true);

  return files.some((file) => [...dirs].some((dir) => `${REPO}/${file}`.startsWith(`${dir}/`)));
});

// Same layout as the production images: `pnpm deploy --prod` output, dist with its .env files,
// metadata.js paths rewritten for the flat layout, and BullMQ Pro dropped in when it was installed.
export const deployApp = Effect.fn('deployApp')(function* (name: string, { dependenciesChanged = true } = {}) {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  const target = `${DEPLOY}/${name}`;
  const dist = `${target}/dist`;
  const src = `${REPO}/apps/${name}/src`;
  const filter = DEPLOYED_APPS[name];
  if (!filter) return yield* new BoxError({ message: `${name} isn't one of the deployed apps` });
  if (!dependenciesChanged && fs.existsSync(`${target}/node_modules/.pnpm`)) yield* refreshWorkspacePackages(target);
  else {
    fs.rmSync(target, { recursive: true, force: true });
    yield* shell.run(
      'pnpm',
      ['--filter', filter, 'deploy', '--legacy', '--prod', '--store-dir', `${DATA}/pnpm-store`, target],
      { env: { ...vars, NODE_OPTIONS: '--max-old-space-size=4096', CI: 'true', HUSKY: '0' } }
    );
  }
  fs.rmSync(dist, { recursive: true, force: true });
  fs.cpSync(`${REPO}/apps/${name}/dist`, dist, { recursive: true });
  fs.copyFileSync(`${src}/.example.env`, `${dist}/.env`);
  fs.copyFileSync(`${src}/.env.development`, `${dist}/.env.development`);
  fs.copyFileSync(`${src}/.env.production`, `${dist}/.env.production`);
  fs.rmSync(`${dist}/.env.test`, { force: true });
  fs.rmSync(`${dist}/.env.ci`, { force: true });

  const metadata = `${dist}/metadata.js`;
  if (fs.existsSync(metadata)) {
    fs.writeFileSync(
      metadata,
      fs
        .readFileSync(metadata, 'utf8')
        .replaceAll('../../../packages/shared/dist', '../node_modules/@novu/shared/dist')
        .replaceAll('../../../libs/application-generic/build', '../node_modules/@novu/application-generic/build')
        .replaceAll('../../../libs/dal/dist', '../node_modules/@novu/dal/dist')
    );
  }

  if (vars.NOVU_MANAGED_SERVICE) {
    const modules = `${target}/node_modules/@taskforcesh`;
    fs.rmSync(modules, { recursive: true, force: true });
    fs.cpSync(`${BULLMQ_PRO}/node_modules/@taskforcesh`, modules, { recursive: true });
    fs.cpSync(`${BULLMQ_PRO}/node_modules`, `${modules}/bullmq-pro/node_modules`, {
      recursive: true,
      filter: (source) => !source.startsWith(`${BULLMQ_PRO}/node_modules/@taskforcesh`),
    });
  }
});

// With the same dependencies, a new `pnpm deploy` (~60 s: it re-resolves the whole workspace) differs from the
// previous one only in the workspace packages it copied in, so re-copy just those (`file+<path>` entries).
const refreshWorkspacePackages = Effect.fn('refreshWorkspacePackages')(function* (target: string) {
  const workspace = yield* workspacePackages;
  const store = `${target}/node_modules/.pnpm`;
  for (const entry of fs.readdirSync(store).filter((name) => name.includes('@file+'))) {
    const name = entry.slice(0, entry.indexOf('@file+', 1)).replace('+', '/');
    const copy = `${store}/${entry}/node_modules/${name}`;
    for (const file of fs.readdirSync(copy).filter((file) => file !== 'node_modules')) {
      const source = `${workspace.get(name)}/${file}`;
      fs.rmSync(`${copy}/${file}`, { recursive: true, force: true });
      if (fs.existsSync(source)) fs.cpSync(source, `${copy}/${file}`, { recursive: true });
    }
  }
});

// Same job as apps/dashboard/docker-entrypoint.sh: expose VITE_* runtime env as window._env_.
export const prepareDashboard = Effect.gen(function* () {
  const { vars } = yield* BoxEnv;
  const target = `${RUN}/dashboard`;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(`${REPO}/apps/dashboard/dist`, target, { recursive: true });

  const viteEnv = Object.fromEntries(Object.entries(vars).filter(([key]) => key.startsWith('VITE_')));
  const script = `<script>window._env_ = ${JSON.stringify(viteEnv).replace(/</g, '\\u003c')};</script>`;
  const indexFile = `${target}/index.html`;
  const html = fs.readFileSync(indexFile, 'utf8').replace('<script type="module"', `${script}\n<script type="module"`);
  fs.writeFileSync(indexFile, html);
  yield* writeBoxJson;
});

// The baked and applied commits, for the dashboard (served at /__box.json).
export const writeBoxJson = Effect.gen(function* () {
  const baked = yield* readJson(BAKED, Baked);
  const applied = yield* readJson(APPLIED, Applied);
  fs.writeFileSync(`${RUN}/dashboard/__box.json`, JSON.stringify({ baked, applied }));
});
