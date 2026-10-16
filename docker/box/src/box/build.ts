// Installing, building and deploying the checkout's apps, which bake and apply share, and the dashboard's runtime
// copy, which start prepares too.

import fs from 'node:fs';
import { relative } from 'node:path';
import { Applied, Baked, fromJson, NestConfig, NxGraph, PackageJson, PnpmPackages } from '../shared/contracts.ts';
import { APPLIED, BAKED, BULLMQ_PRO, DATA, DEPLOY, NX, REPO, RUN } from './paths.ts';
import { DEPLOYED_APPS } from './processes.ts';
import { output, readJson, run, vars } from './runtime.ts';

export async function pnpmInstall(): Promise<void> {
  await run('pnpm', ['install', '--frozen-lockfile', '--store-dir', `${DATA}/pnpm-store`], {
    env: { ...vars, NODE_OPTIONS: '', CI: 'true', HUSKY: '0', CYPRESS_INSTALL_BINARY: '0' },
  });
  await run('pnpm', ['symlink:submodules']);
}

async function projectGraph() {
  const file = `${RUN}/nx-graph.json`;
  fs.mkdirSync(RUN, { recursive: true });
  await output(NX, ['graph', `--file=${file}`]);
  const graph = readJson(file, NxGraph);
  if (!graph) throw new Error(`nx graph wrote no ${file}`);

  return graph.graph;
}

function packageJson(dir: string) {
  return readJson(`${dir}/package.json`, PackageJson) ?? {};
}

// The API, the worker and the dashboard build in their own runs to get their own arguments (`--sourcemap false` takes
// vite's peak from ~4 GB to ~2.5 GB). Their dependencies build once, in the first run. nx can't hash the enterprise
// packages (their src links into the nxignored submodule), so it rebuilds them every time (~25 s); without
// `enterprise` they are left out and their last dist is reused.
// Libraries first, 4 at a time (the box has 4 vCPUs; peak memory measured 4.2 of 12 GiB). Then the worker, and the
// API's metadata and build, at the same time.
export async function build(projects: ReadonlyArray<string>, { enterprise = true } = {}): Promise<void> {
  const nx = (args: ReadonlyArray<string>) => run(NX, args, { env: { ...vars, NODE_OPTIONS: '' } });
  const graph = await projectGraph();
  const own = ['@novu/api-service', '@novu/worker', '@novu/dashboard'].filter((project) => projects.includes(project));
  const first = new Set(projects.filter((project) => !own.includes(project)));
  for (const project of own) {
    const root = graph.nodes[project]?.data.root;
    if (root === undefined) continue;
    const { devDependencies = {} } = packageJson(`${REPO}/${root}`);
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
    await nx(['run-many', '-t', 'build', `--projects=${libs.join(',')}`, '--excludeTaskDependencies', '--parallel=4']);
  const apps: Array<Promise<void>> = [];
  if (own.includes('@novu/worker'))
    apps.push(nx(['run', '@novu/worker:build', '--excludeTaskDependencies', '--', '-c', withoutTypeCheck('worker')]));
  if (own.includes('@novu/api-service'))
    apps.push(
      nx(['run', '@novu/api-service:build-metadata', '--excludeTaskDependencies']).then(() =>
        nx(['run', '@novu/api-service:build', '--excludeTaskDependencies', '--', '-c', withoutTypeCheck('api')])
      )
    );
  const failed = (await Promise.allSettled(apps)).find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
  if (own.includes('@novu/dashboard'))
    await nx(['run', '@novu/dashboard:build', '--excludeTaskDependencies', '--', '--sourcemap', 'false']);
}

// An app's nest-cli.json without `typeCheck`: the same swc output without a full type-check (API ~6 s instead of
// ~57 s, worker ~4 s instead of ~14 s). CI's build type-checks every PR.
function withoutTypeCheck(app: string): string {
  const config = readJson(`${REPO}/apps/${app}/nest-cli.json`, NestConfig);
  if (!config) throw new Error(`apps/${app} has no nest-cli.json`);
  config.compilerOptions.typeCheck = false;
  fs.mkdirSync(RUN, { recursive: true });
  fs.writeFileSync(`${RUN}/${app}-nest-cli.json`, JSON.stringify(config));

  return relative(`${REPO}/apps/${app}`, `${RUN}/${app}-nest-cli.json`);
}

// `compile` mode skips the type check and the static prerender, which the playground doesn't pass; every page
// renders on request, as under `next dev`. Turbopack takes ~45 s and ~2.4 GB, webpack ~110 s.
export async function buildBridge(): Promise<void> {
  await run('node_modules/.bin/next', ['build', '--turbopack', '--experimental-build-mode', 'compile'], {
    cwd: `${REPO}/playground/nextjs`,
    env: { ...vars, NODE_OPTIONS: '', NEXT_TELEMETRY_DISABLED: '1' },
  });
}

async function workspacePackages(): Promise<Map<string, string>> {
  const list = fromJson(PnpmPackages).parse(await output('pnpm', ['-s', 'ls', '-r', '--depth', '-1', '--json']));

  return new Map(list.map((pkg) => [pkg.name, pkg.path]));
}

// nx counts devDependencies as build inputs, so the dashboard's test-only helpers (@novu/dal, @novu/ee-auth) make
// every backend change rebuild it. Its bundle reads apps/dashboard, its runtime dependencies, and everything those
// depend on, devDependencies included (libraries bundle some of theirs).
export async function dashboardBundleChanged(files: ReadonlyArray<string>): Promise<boolean> {
  const workspace = await workspacePackages();
  const dirs = new Set<string>();
  const visit = (name: string, isDashboard = false) => {
    const dir = workspace.get(name);
    if (!dir || dirs.has(dir)) return;
    dirs.add(dir);
    const pkg = packageJson(dir);
    for (const dep of Object.keys({ ...pkg.dependencies, ...(!isDashboard && pkg.devDependencies) })) visit(dep);
  };
  visit('@novu/dashboard', true);

  return files.some((file) => [...dirs].some((dir) => `${REPO}/${file}`.startsWith(`${dir}/`)));
}

// Same layout as the production images: `pnpm deploy --prod` output, dist with its .env files,
// metadata.js paths rewritten for the flat layout, and BullMQ Pro dropped in when it was installed.
export async function deployApp(name: string, { dependenciesChanged = true } = {}): Promise<void> {
  const target = `${DEPLOY}/${name}`;
  const dist = `${target}/dist`;
  const src = `${REPO}/apps/${name}/src`;
  const filter = DEPLOYED_APPS[name];
  if (!filter) throw new Error(`${name} isn't one of the deployed apps`);
  if (!dependenciesChanged && fs.existsSync(`${target}/node_modules/.pnpm`)) await refreshWorkspacePackages(target);
  else {
    fs.rmSync(target, { recursive: true, force: true });
    await run(
      'pnpm',
      ['--filter', filter, 'deploy', '--legacy', '--prod', '--store-dir', `${DATA}/pnpm-store`, target],
      {
        env: { ...vars, NODE_OPTIONS: '--max-old-space-size=4096', CI: 'true', HUSKY: '0' },
      }
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
}

// With the same dependencies, a new `pnpm deploy` (~60 s: it re-resolves the whole workspace) differs from the
// previous one only in the workspace packages it copied in, so re-copy just those (`file+<path>` entries).
async function refreshWorkspacePackages(target: string): Promise<void> {
  const workspace = await workspacePackages();
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
}

// Same job as apps/dashboard/docker-entrypoint.sh: expose VITE_* runtime env as window._env_.
export function prepareDashboard(): void {
  const target = `${RUN}/dashboard`;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(`${REPO}/apps/dashboard/dist`, target, { recursive: true });

  const viteEnv = Object.fromEntries(Object.entries(vars).filter(([key]) => key.startsWith('VITE_')));
  const script = `<script>window._env_ = ${JSON.stringify(viteEnv).replace(/</g, '\\u003c')};</script>`;
  const indexFile = `${target}/index.html`;
  const html = fs.readFileSync(indexFile, 'utf8').replace('<script type="module"', `${script}\n<script type="module"`);
  fs.writeFileSync(indexFile, html);
  writeBoxJson();
}

// The baked and applied commits, for the dashboard (served at /__box.json).
export function writeBoxJson(): void {
  const baked = readJson(BAKED, Baked);
  const applied = readJson(APPLIED, Applied);
  fs.writeFileSync(`${RUN}/dashboard/__box.json`, JSON.stringify({ baked, applied }));
}
