import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from '../node/main.ts';
import { Applied, Baked, fromJson, NestConfig, NxGraph, PackageJson, PnpmPackages } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { APPLIED, BAKED, BULLMQ_PRO, DATA, DEPLOY, NX, REPO, RUN } from './paths.ts';
import { DEPLOYED_APPS } from './processes.ts';
import { allSettled, output, readJson, run, step, vars } from './runtime.ts';

const APPS = ['@novu/api-service', '@novu/worker', '@novu/dashboard'];
const FRAMEWORK = '@novu/framework';
const FRAMEWORK_TYPES_STALE = `${DATA}/.framework-declarations-stale`;

// What an apply changed, so that only that is built. A bake, `--full`, an install and an apply after an
// interrupted one build everything instead.
export interface Changes {
  readonly files: ReadonlyArray<string>;
  // The changed files that existed before and still do.
  readonly modified: ReadonlySet<string>;
  readonly affected: ReadonlyArray<string>;
}

type Graph = Awaited<ReturnType<typeof projectGraph>>;

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

const nx = (args: ReadonlyArray<string>) => run(NX, args, { env: { ...vars, NODE_OPTIONS: '' } });

export async function build(
  projects: ReadonlyArray<string>,
  { enterprise = true, changes }: { enterprise?: boolean; changes?: Changes | undefined } = {}
): Promise<void> {
  const own = APPS.filter((project) => projects.includes(project));
  const typesChanged = await buildLibraries(projects, own, enterprise, changes);
  const apps: Array<Promise<void>> = [];
  if (own.includes('@novu/worker')) apps.push(buildNestApp('worker', changes, false));
  if (own.includes('@novu/api-service')) apps.push(buildNestApp('api', changes, typesChanged));
  await allSettled(apps);
  if (own.includes('@novu/dashboard'))
    await nx(['run', '@novu/dashboard:build', '--excludeTaskDependencies', '--', '--sourcemap', 'false']);
}

// Returns whether a library's declarations may have changed, which the API's metadata reads.
async function buildLibraries(
  projects: ReadonlyArray<string>,
  own: ReadonlyArray<string>,
  enterprise: boolean,
  changes: Changes | undefined
): Promise<boolean> {
  // nx affected lists every project a change reaches, through root files too.
  if (changes?.affected.every((project) => APPS.includes(project))) return false;
  const graph = await projectGraph();
  const libs = libraryClosure(graph, projects, own, enterprise);
  const owned = (file: string) =>
    Object.values(graph.nodes).some(({ data: { root } }) => root !== '.' && file.startsWith(`${root}/`));
  if (changes?.files.every(owned))
    return buildChangedLibraries(
      graph,
      libs.filter((lib) => changes.affected.includes(lib)),
      changes.files
    );
  if (libs.length) await buildViaNx(libs);

  return true;
}

async function buildViaNx(libs: ReadonlyArray<string>): Promise<void> {
  await nx(['run-many', '-t', 'build', `--projects=${libs.join(',')}`, '--excludeTaskDependencies', '--parallel=4']);
  if (libs.includes(FRAMEWORK)) fs.rmSync(FRAMEWORK_TYPES_STALE, { force: true });
}

// The libraries the projects run on, which nx's cache replays when unchanged.
function libraryClosure(
  graph: Graph,
  projects: ReadonlyArray<string>,
  own: ReadonlyArray<string>,
  enterprise: boolean
): Array<string> {
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

  return [...closure].filter((project) => {
    const node = graph.nodes[project];

    return Boolean(node?.data.targets?.build) && (enterprise || !node?.data.root.startsWith('enterprise/packages/'));
  });
}

// Builds the libraries the files are in, then each library depending on them whose output can change with them:
// tsc compiles file by file, so a library it builds reads its dependencies' declarations (.d.ts), not their code;
// a bundler copies their code in. Returns whether any declarations changed.
async function buildChangedLibraries(
  graph: Graph,
  libs: ReadonlyArray<string>,
  files: ReadonlyArray<string>
): Promise<boolean> {
  const root = (lib: string) => graph.nodes[lib]?.data.root ?? lib;
  const below = dependenciesOf(graph);
  const touched = new Set(libs.filter((lib) => files.some((file) => file.startsWith(`${root(lib)}/`))));
  const rebuilt = new Set<string>();
  const typesChanged = new Set<string>();
  const dirty = (lib: string) =>
    touched.has(lib) ||
    [...below(lib)].some((dep) => typesChanged.has(dep) || (rebuilt.has(dep) && !compilesFileByFile(root(lib))));
  const pending = new Set(libs);
  while (pending.size) {
    const batch = nextBatch(pending, dirty, below);
    if (!batch.length) continue;
    const declared = new Map(batch.map((lib) => [lib, declarations(root(lib))]));
    const readsFrameworkTypes = batch.some(
      (lib) => lib !== FRAMEWORK && below(lib).has(FRAMEWORK) && (touched.has(lib) || compilesFileByFile(root(lib)))
    );
    await buildBatch(batch, readsFrameworkTypes, batch.includes(FRAMEWORK) && frameworkTypesUnread(touched, below));
    for (const lib of batch) {
      pending.delete(lib);
      rebuilt.add(lib);
      if (declarations(root(lib)) !== declared.get(lib)) typesChanged.add(lib);
    }
  }
  const kept = libs.filter((lib) => !rebuilt.has(lib));
  log(
    `libraries rebuilt: ${[...rebuilt].join(' ') || 'none'}; declarations changed: ${[...typesChanged].join(' ') || 'none'}${kept.length ? `; kept (nothing they compile against changed): ${kept.join(' ')}` : ''}`
  );

  return typesChanged.size > 0;
}

// Drops the pending libraries that turned out clean and returns the dirty ones to build next. nx orders a batch
// by its dependencies; one that waits for a library outside the batch waits a round.
function nextBatch(
  pending: Set<string>,
  dirty: (lib: string) => boolean,
  below: (project: string) => ReadonlySet<string>
): Array<string> {
  const before = pending.size;
  const waits = (lib: string) => [...below(lib)].some((dep) => pending.has(dep));
  for (const lib of pending) if (!dirty(lib) && !waits(lib)) pending.delete(lib);
  let batch = [...pending].filter(dirty);
  for (let size = -1; size !== batch.length; ) {
    size = batch.length;
    batch = batch.filter((lib) => [...below(lib)].every((dep) => !pending.has(dep) || batch.includes(dep)));
  }
  // A dependency cycle: build what's left as nx would.
  if (!batch.length && pending.size === before) return [...pending];

  return batch;
}

// The framework first: a library in the batch that bundles it must bundle its new code.
async function buildBatch(
  batch: ReadonlyArray<string>,
  readsFrameworkTypes: boolean,
  frameworkCodeOnly: boolean
): Promise<void> {
  if (frameworkCodeOnly) await step('build @novu/framework without declarations', buildFrameworkCode);
  if (!batch.includes(FRAMEWORK) && readsFrameworkTypes && fs.existsSync(FRAMEWORK_TYPES_STALE))
    await step('build @novu/framework with the declarations an earlier apply skipped', () => buildViaNx([FRAMEWORK]));
  const viaNx = batch.filter((lib) => !(frameworkCodeOnly && lib === FRAMEWORK));
  if (viaNx.length) await buildViaNx(viaNx);
}

function dependenciesOf(graph: Graph): (project: string) => ReadonlySet<string> {
  const known = new Map<string, Set<string>>();

  return (project) => {
    const cached = known.get(project);
    if (cached) return cached;
    const found = new Set<string>();
    const queue = [project];
    for (const current of queue)
      for (const { target } of graph.dependencies[current] ?? [])
        if (graph.nodes[target] && target !== project && !found.has(target)) {
          found.add(target);
          queue.push(target);
        }
    known.set(project, found);

    return found;
  };
}

function compilesFileByFile(root: string): boolean {
  const scripts = Object.entries(packageJson(`${REPO}/${root}`).scripts ?? {})
    .filter(([name]) => /^(pre)?build(:|$)/.test(name))
    .map(([, script]) => script)
    .join(' ');

  // Another script it runs (`pnpm run bundle`) isn't read, so it may bundle.
  const bundles = /\b(tsup|rollup|vite|esbuild|webpack)\b|\bnode\s|\brun\s+(?!build[:\s]|build$)/;

  return /\btsc\b/.test(scripts) && !bundles.test(scripts);
}

function declarations(root: string): string {
  const hash = createHash('sha1');
  for (const out of ['dist', 'build']) {
    const dir = `${REPO}/${root}/${out}`;
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((file) => /\.d\.[cm]?ts$/.test(file))
      .sort();
    for (const file of files) hash.update(`${out}/${file}\0`).update(fs.readFileSync(`${dir}/${file}`));
  }

  return hash.digest('hex');
}

// Nothing in the box type-checks against @novu/framework but the libraries tsc builds, so it can skip its
// declarations (90 of its 92 s) unless a library changed in this apply compiles against them. The old ones stay, and
// FRAMEWORK_TYPES_STALE says so: the next apply that builds such a library builds the framework's first.
function frameworkTypesUnread(touched: ReadonlySet<string>, below: (project: string) => ReadonlySet<string>): boolean {
  const readers = [...touched].filter((lib) => lib !== FRAMEWORK && below(lib).has(FRAMEWORK));

  return !readers.length && fs.existsSync(`${REPO}/packages/framework/dist/cjs/index.d.cts`);
}

async function buildFrameworkCode(): Promise<void> {
  // tsup bundles its config next to it, then imports tsup from there: it needs the framework's node_modules.
  const config = `${REPO}/packages/framework/node_modules/.cache/box-tsup.config.ts`;
  fs.mkdirSync(dirname(config), { recursive: true });
  fs.writeFileSync(
    config,
    `import configs from '${REPO}/packages/framework/tsup.config.ts';\n` +
      `export default configs.map((config) => ({ ...config, dts: false, clean: ['!**/*.d.{ts,cts,mts}'] }));\n`
  );
  fs.writeFileSync(FRAMEWORK_TYPES_STALE, '');
  await run('node_modules/.bin/tsup', ['--config', config], {
    cwd: `${REPO}/packages/framework`,
    env: { ...vars, NODE_OPTIONS: '', NODE_ENV: 'production' },
  });
}

// SWC compiles each file on its own, so compiling only an app's changed sources gives what `nest build` would. A
// library change compiles none; the API then regenerates its metadata, which reads the libraries' types, only
// when their declarations changed.
async function buildNestApp(app: 'api' | 'worker', changes: Changes | undefined, typesChanged: boolean): Promise<void> {
  const project = app === 'api' ? '@novu/api-service' : '@novu/worker';
  const sources = changes ? changedSources(app, changes) : null;
  if (!sources) {
    if (app === 'api') await nx(['run', `${project}:build-metadata`, '--excludeTaskDependencies']);
    await nx(['run', `${project}:build`, '--excludeTaskDependencies', '--', '-c', withoutTypeCheck(app)]);

    return;
  }
  const metadata = app === 'api' && (sources.length > 0 || typesChanged);
  if (metadata) await step('api metadata', generateApiMetadata);
  const files = metadata ? [...sources, 'src/metadata.ts'] : sources;
  if (!files.length) return log(`${app}: no source to compile`);
  await step(`compile ${app} ${files.join(' ')}`, () =>
    run('node', [fileURLToPath(new URL('nest-swc.ts', import.meta.url)), ...files], {
      cwd: `${REPO}/apps/${app}`,
      env: { ...vars, NODE_OPTIONS: '' },
    })
  );
}

const TEST_FILE = /\.(spec|e2e|e2e-ee)\.ts$/;

// The app's changed sources, or null when compiling only them might not give what `nest build` would: a new,
// deleted or renamed file, a declaration file, a changed config (the app's, or the root tsconfig.json its
// tsconfig extends), or no earlier build. Tests aren't built.
function changedSources(app: string, { files, modified }: Changes): Array<string> | null {
  const dir = `apps/${app}/`;
  if (files.includes('tsconfig.json') || !fs.existsSync(`${REPO}/${dir}dist/main.js`)) return null;
  const sources: Array<string> = [];
  for (const file of files.filter((changed) => changed.startsWith(dir))) {
    const path = file.slice(dir.length);
    if (path.startsWith('e2e/') || TEST_FILE.test(path)) continue;
    if (!modified.has(file) || !/^src\/.+\.ts$/.test(path) || path.endsWith('.d.ts')) return null;
    sources.push(path);
  }

  return sources;
}

// `pnpm run build:metadata` without pnpm, and without type-checking the script itself (the generator makes its own
// TypeScript program): the same metadata, 2 to 4 s sooner.
function generateApiMetadata(): Promise<void> {
  return run('node', ['node_modules/ts-node/dist/bin.js', 'scripts/generate-metadata.ts'], {
    cwd: `${REPO}/apps/api`,
    env: { ...vars, NODE_OPTIONS: '', TS_NODE_TRANSPILE_ONLY: 'true' },
  });
}

function withoutTypeCheck(app: string): string {
  const config = readJson(`${REPO}/apps/${app}/nest-cli.json`, NestConfig);
  if (!config) throw new Error(`apps/${app} has no nest-cli.json`);
  config.compilerOptions.typeCheck = false;
  fs.mkdirSync(RUN, { recursive: true });
  fs.writeFileSync(`${RUN}/${app}-nest-cli.json`, JSON.stringify(config));

  return relative(`${REPO}/apps/${app}`, `${RUN}/${app}-nest-cli.json`);
}

// Unminified, the build takes about 11 s less. Next reads next.config.js before the playground's next.config.mjs,
// so a wrapper there turns minifying off for this build only.
export async function buildBridge(): Promise<void> {
  const dir = `${REPO}/playground/nextjs`;
  const wrapper = `${dir}/next.config.js`;
  const wrap = !fs.existsSync(wrapper) && fs.existsSync(`${dir}/next.config.mjs`);
  if (wrap)
    fs.writeFileSync(
      wrapper,
      `module.exports = async (...args) => {
  const { default: config } = await import('./next.config.mjs');
  const resolved = typeof config === 'function' ? await config(...args) : config;
  return { ...resolved, experimental: { ...resolved.experimental, turbopackMinify: false } };
};
`
    );
  try {
    await run('node_modules/.bin/next', ['build', '--turbopack', '--experimental-build-mode', 'compile'], {
      cwd: dir,
      env: { ...vars, NODE_OPTIONS: '', NEXT_TELEMETRY_DISABLED: '1' },
    });
  } finally {
    if (wrap) fs.rmSync(wrapper);
  }
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

export interface DeployOptions {
  // Its locked dependencies changed: a full `pnpm deploy`.
  readonly dependenciesChanged?: boolean;
  // A workspace package it runs on may have changed: their copies in the deploy are refreshed.
  readonly workspaceChanged?: boolean;
}

export async function deployApp(
  name: string,
  { dependenciesChanged = true, workspaceChanged = true }: DeployOptions = {}
): Promise<void> {
  const target = `${DEPLOY}/${name}`;
  const dist = `${target}/dist`;
  const src = `${REPO}/apps/${name}/src`;
  const filter = DEPLOYED_APPS[name];
  if (!filter) throw new Error(`${name} isn't one of the deployed apps`);
  if (dependenciesChanged || !fs.existsSync(`${target}/node_modules/.pnpm`)) await pnpmDeploy(filter, target);
  else {
    if (workspaceChanged) await refreshWorkspacePackages(target);
    // The app reads its version from it; with the same dependencies, a deploy writes the same file.
    fs.copyFileSync(`${REPO}/apps/${name}/package.json`, `${target}/package.json`);
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

// `--offline` resolves from the store `pnpm install` just filled: about 20 s sooner, and two deploys can run at
// once. It fails on a package the store has no metadata for; then the deploy goes online.
async function pnpmDeploy(filter: string, target: string): Promise<void> {
  const deploy = (offline: boolean) => {
    putAside(target);
    const args = ['--filter', filter, 'deploy', '--legacy', '--prod', ...(offline ? ['--offline'] : [])];

    return run('pnpm', [...args, '--store-dir', `${DATA}/pnpm-store`, target], {
      env: { ...vars, NODE_OPTIONS: '--max-old-space-size=4096', CI: 'true', HUSKY: '0' },
    });
  };
  await deploy(true).catch((error) => {
    log(`WARN: the offline deploy of ${filter} failed (${messageOf(error)}); deploying online`);

    return deploy(false);
  });
}

// Deleting a deploy (1.9 GB, 170,000 files) takes 7 to 17 s; renamed, it's deleted in the background, with any a
// stopped box left.
function putAside(dir: string): void {
  if (fs.existsSync(dir)) fs.renameSync(dir, `${DEPLOY}/.trash-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  spawn('sh', ['-c', `rm -rf ${DEPLOY}/.trash-*`], { detached: true, stdio: 'ignore' }).unref();
}

async function refreshWorkspacePackages(target: string): Promise<void> {
  const workspace = await workspacePackages();
  const store = `${target}/node_modules/.pnpm`;
  for (const entry of fs.readdirSync(store).filter((name) => name.includes('@file+'))) {
    const name = entry.slice(0, entry.indexOf('@file+', 1)).replace('+', '/');
    const copy = `${store}/${entry}/node_modules/${name}`;
    const dir = workspace.get(name);
    if (!dir) continue;
    // The source's entries too: a build may add one (an `esm/` folder).
    const entries = new Set([...fs.readdirSync(copy), ...fs.readdirSync(dir)]);
    for (const file of [...entries].filter((file) => file !== 'node_modules')) {
      const source = `${dir}/${file}`;
      fs.rmSync(`${copy}/${file}`, { recursive: true, force: true });
      if (fs.existsSync(source)) fs.cpSync(source, `${copy}/${file}`, { recursive: true });
    }
  }
}

// A box restores every byte of its snapshot chain, and deleting in a later snapshot doesn't shrink it. nx's cache
// replays builds an apply rarely repeats, so base saves without it. pnpm's store and metadata cache stay: without
// them a lockfile change took 2 to 3 minutes longer.
export async function dropNxCache(): Promise<void> {
  await fs.promises.rm(`${REPO}/.nx/cache`, { recursive: true, force: true });
}

export function prepareDashboard(): void {
  const target = `${RUN}/dashboard`;
  fs.rmSync(target, { recursive: true, force: true });
  // Every start makes this copy; a reflinked one shares the build's blocks instead of adding them to the next snapshot.
  execFileSync('cp', ['-R', '--reflink=auto', `${REPO}/apps/dashboard/dist`, target]);

  const viteEnv = Object.fromEntries(Object.entries(vars).filter(([key]) => key.startsWith('VITE_')));
  const script = `<script>window._env_ = ${JSON.stringify(viteEnv).replace(/</g, '\\u003c')};</script>`;
  const indexFile = `${target}/index.html`;
  const html = fs.readFileSync(indexFile, 'utf8').replace('<script type="module"', `${script}\n<script type="module"`);
  fs.writeFileSync(indexFile, html);
  writeBoxJson();
}

export function writeBoxJson(): void {
  const baked = readJson(BAKED, Baked);
  const applied = readJson(APPLIED, Applied);
  fs.writeFileSync(`${RUN}/dashboard/__box.json`, JSON.stringify({ baked, applied }));
}
