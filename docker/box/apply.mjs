// `box apply`: put a PR, branch, SHA or `cli.mjs sync` bundle on a running box, and rebuild and restart only what it
// changes. bake builds and deploys with the same functions, and start prepares the dashboard with them.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { relative } from 'node:path';
import {
  API_HEALTH,
  APPLIED,
  APPLYING,
  BAKED,
  BULLMQ_PRO,
  CODE_PROCESSES,
  DATA,
  DEPLOY,
  DEPLOYED_APPS,
  env,
  fetchRef,
  gitWithToken,
  holdLock,
  log,
  NX,
  output,
  PATH_PROCESSES,
  PROJECT_PROCESSES,
  pc,
  poll,
  REPO,
  REPO_URL,
  RUN,
  readJson,
  run,
  runAsync,
  runnable,
  step,
  stopRunning,
  storesReady,
  waitForHttp,
} from './lib.mjs';
import { migrate } from './migrate.mjs';
import { syncBridge } from './seed.mjs';

// A PR runs on top of the baked commit, like CI's merge ref, so a branch cut from an older `next`
// doesn't roll the box back. GitHub's own merge ref can lag behind `next`, so the merge is local.
function mergeOntoBaked(ref, prHead) {
  const baked = readJson(BAKED).sha;
  if (spawnSync('git', ['merge-base', '--is-ancestor', baked, prHead], { cwd: REPO }).status === 0) return prHead;
  const merge = spawnSync('git', ['merge-tree', '--write-tree', baked, prHead], { encoding: 'utf8', env, cwd: REPO });
  if (merge.status !== 0)
    throw new Error(`${ref} conflicts with the baked ${baked.slice(0, 10)}; rebase it:\n${merge.stdout}`);
  const identity = {
    GIT_AUTHOR_NAME: 'box',
    GIT_AUTHOR_EMAIL: 'box@box.internal',
    GIT_COMMITTER_NAME: 'box',
    GIT_COMMITTER_EMAIL: 'box@box.internal',
  };
  const tree = merge.stdout.split('\n')[0];

  return output('git', ['commit-tree', tree, '-p', baked, '-p', prHead, '-m', `box: ${ref} on ${baked.slice(0, 10)}`], {
    env: { ...env, ...identity },
  });
}

// A bundle from `cli.mjs sync` holds one commit: a snapshot of a checkout, committed or not, on top of its HEAD.
// Its prerequisites are in the baked commit's history, which the box always has.
function unbundle(file) {
  const [head, ...others] = output('git', ['bundle', 'unbundle', file]).split('\n');
  if (others.length) throw new Error(`${file} has ${others.length + 1} heads; expected the one from cli.mjs sync`);
  const sha = head.split(' ')[0];

  return { sha, subject: output('git', ['log', '-1', '--format=%s', sha]) };
}

export function pnpmInstall() {
  run('pnpm', ['install', '--frozen-lockfile', '--store-dir', `${DATA}/pnpm-store`], {
    env: { ...env, NODE_OPTIONS: '', CI: 'true', HUSKY: '0', CYPRESS_INSTALL_BINARY: '0' },
  });
  run('pnpm', ['symlink:submodules']);
}

// The API, the worker and the dashboard build in their own runs to get their own arguments (`--sourcemap false` takes
// vite's peak from ~4 GB to ~2.5 GB). Their dependencies build once, in the first run. nx can't hash the enterprise
// packages (their src links into the nxignored submodule), so it rebuilds them every time (~25 s); without
// `enterprise` they are left out and their last dist is reused.
// Libraries first, 4 at a time (the box has 4 vCPUs; peak memory measured 4.2 of 12 GiB). Then the worker, and the
// API's metadata and build, at the same time.
export async function build(projects, { enterprise = true } = {}) {
  const nxEnv = { env: { ...env, NODE_OPTIONS: '' } };
  const nx = (args) => run(NX, args, nxEnv);
  const graph = projectGraph();
  const own = ['@novu/api-service', '@novu/worker', '@novu/dashboard'].filter((project) => projects.includes(project));
  const first = new Set(projects.filter((project) => !own.includes(project)));
  for (const project of own) {
    const { devDependencies = {} } = readJson(`${REPO}/${graph.nodes[project].data.root}/package.json`);
    for (const { target } of graph.dependencies[project])
      if (graph.nodes[target] && !(target in devDependencies)) first.add(target);
  }
  const closure = new Set();
  const visit = (project) => {
    if (closure.has(project) || !graph.nodes[project]) return;
    closure.add(project);
    graph.dependencies[project].forEach(({ target }) => visit(target));
  };
  first.forEach(visit);
  const libs = [...closure].filter(
    (project) =>
      graph.nodes[project].data.targets?.build &&
      (enterprise || !graph.nodes[project].data.root.startsWith('enterprise/packages/'))
  );
  if (libs.length)
    nx(['run-many', '-t', 'build', `--projects=${libs.join(',')}`, '--excludeTaskDependencies', '--parallel=4']);
  const apps = [];
  if (own.includes('@novu/worker'))
    apps.push(
      runAsync(
        NX,
        ['run', '@novu/worker:build', '--excludeTaskDependencies', '--', '-c', nestConfigWithoutTypeCheck('worker')],
        nxEnv
      )
    );
  if (own.includes('@novu/api-service'))
    apps.push(
      (async () => {
        await runAsync(NX, ['run', '@novu/api-service:build-metadata', '--excludeTaskDependencies'], nxEnv);
        await runAsync(
          NX,
          [
            'run',
            '@novu/api-service:build',
            '--excludeTaskDependencies',
            '--',
            '-c',
            nestConfigWithoutTypeCheck('api'),
          ],
          nxEnv
        );
      })()
    );
  await Promise.all(apps);
  if (own.includes('@novu/dashboard'))
    nx(['run', '@novu/dashboard:build', '--excludeTaskDependencies', '--', '--sourcemap', 'false']);
}

// An app's nest-cli.json without `typeCheck`: the same swc output without a full type-check (API ~6 s instead of
// ~57 s, worker ~4 s instead of ~14 s). CI's build type-checks every PR.
function nestConfigWithoutTypeCheck(app) {
  const config = readJson(`${REPO}/apps/${app}/nest-cli.json`);
  config.compilerOptions.typeCheck = false;
  fs.mkdirSync(RUN, { recursive: true });
  fs.writeFileSync(`${RUN}/${app}-nest-cli.json`, JSON.stringify(config));

  return relative(`${REPO}/apps/${app}`, `${RUN}/${app}-nest-cli.json`);
}

// `compile` mode skips the type check and the static prerender, which the playground doesn't pass; every page
// renders on request, as under `next dev`. Turbopack takes ~45 s and ~2.4 GB, webpack ~110 s.
export function buildBridge() {
  run('node_modules/.bin/next', ['build', '--turbopack', '--experimental-build-mode', 'compile'], {
    cwd: `${REPO}/playground/nextjs`,
    env: { ...env, NODE_OPTIONS: '', NEXT_TELEMETRY_DISABLED: '1' },
  });
}

function projectGraph() {
  const file = `${RUN}/nx-graph.json`;
  fs.mkdirSync(RUN, { recursive: true });
  output(NX, ['graph', `--file=${file}`]);

  return readJson(file).graph;
}

function workspacePackages() {
  return new Map(
    JSON.parse(output('pnpm', ['-s', 'ls', '-r', '--depth', '-1', '--json'])).map((pkg) => [pkg.name, pkg.path])
  );
}

// nx counts devDependencies as build inputs, so the dashboard's test-only helpers (@novu/dal, @novu/ee-auth) make
// every backend change rebuild it. Its bundle reads apps/dashboard, its runtime dependencies, and everything those
// depend on, devDependencies included (libraries bundle some of theirs).
function dashboardBundleChanged(files) {
  const workspace = workspacePackages();
  const dirs = new Set();
  const visit = (name, isDashboard = false) => {
    const dir = workspace.get(name);
    if (!dir || dirs.has(dir)) return;
    dirs.add(dir);
    const pkg = readJson(`${dir}/package.json`);
    Object.keys({ ...pkg.dependencies, ...(isDashboard ? {} : pkg.devDependencies) }).forEach((dep) => visit(dep));
  };
  visit('@novu/dashboard', true);

  return files.some((file) => [...dirs].some((dir) => `${REPO}/${file}`.startsWith(`${dir}/`)));
}

// Same layout as the production images: `pnpm deploy --prod` output, dist with its .env files,
// metadata.js paths rewritten for the flat layout, and BullMQ Pro dropped in when it was installed.
export function deployApp(name, { dependenciesChanged = true } = {}) {
  const target = `${DEPLOY}/${name}`;
  const dist = `${target}/dist`;
  const src = `${REPO}/apps/${name}/src`;
  if (!dependenciesChanged && fs.existsSync(`${target}/node_modules/.pnpm`)) refreshWorkspacePackages(target);
  else {
    fs.rmSync(target, { recursive: true, force: true });
    run(
      'pnpm',
      ['--filter', DEPLOYED_APPS[name], 'deploy', '--legacy', '--prod', '--store-dir', `${DATA}/pnpm-store`, target],
      {
        env: { ...env, NODE_OPTIONS: '--max-old-space-size=4096', CI: 'true', HUSKY: '0' },
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

  if (env.NOVU_MANAGED_SERVICE) {
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
function refreshWorkspacePackages(target) {
  const workspace = workspacePackages();
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
export function prepareDashboard() {
  const target = `${RUN}/dashboard`;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(`${REPO}/apps/dashboard/dist`, target, { recursive: true });

  const viteEnv = Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith('VITE_')));
  const script = `<script>window._env_ = ${JSON.stringify(viteEnv).replace(/</g, '\\u003c')};</script>`;
  const indexFile = `${target}/index.html`;
  const html = fs.readFileSync(indexFile, 'utf8').replace('<script type="module"', `${script}\n<script type="module"`);
  fs.writeFileSync(indexFile, html);
  writeBoxJson();
}

// The baked and applied commits, for the dashboard (served at /__box.json).
function writeBoxJson() {
  fs.writeFileSync(
    `${RUN}/dashboard/__box.json`,
    JSON.stringify({ baked: readJson(BAKED), applied: readJson(APPLIED) })
  );
}

// Puts changes on a running box: a PR, branch or SHA from GitHub, or a bundle from `cli.mjs sync` (a checkout's
// changes). Either is merged onto the baked commit, then the same steps run: diff against what the box runs, plan,
// build, restart. `--full` plans everything, like a bake, for when the incremental plan is in doubt.
//
// An apply that fails after its checkout leaves APPLYING behind with the files it planned for. The next apply plans
// for those too (and for everything, if that one was --full), so nothing a chain of failed applies half-built stays
// in place.
//
// `token`: the GitHub token for the fetch of the enterprise submodule and the CI lookup, and nothing else.
export async function apply({ ref, bundle, full: fullAsked = false, token }) {
  if (!ref === !bundle) throw new Error('usage: box apply <pr-number|branch|sha> | --bundle <file> [--full]');
  const releaseLock = holdLock('apply');
  try {
    // A box that is still starting (woken for this apply) runs its own `migrate`; the plan stops and restarts apps.
    await poll(300, storesReady, "the stores aren't ready, or migrate didn't finish, after 300s");
    const base = (readJson(APPLIED) ?? readJson(BAKED)).sha;
    const interrupted = readJson(APPLYING);
    const full = fullAsked || Boolean(interrupted?.full);
    const target = await step('fetch', () => {
      const fetched = bundle ? unbundle(bundle) : { sha: fetchRef(ref), subject: ref };

      return {
        ref: fetched.subject,
        source: bundle ? 'sync' : 'github',
        head: fetched.sha,
        sha: mergeOntoBaked(fetched.subject, fetched.sha),
      };
    });
    const changed = (to) => output('git', ['diff', '--name-only', base, to]).split('\n').filter(Boolean);
    const files = [...new Set([...changed(target.sha), ...(interrupted?.files ?? [])])];
    log(`${files.length} files changed between ${base.slice(0, 10)} and ${target.sha.slice(0, 10)}`);
    if (interrupted) log(`the last apply (${interrupted.sha.slice(0, 10)}) didn't finish; its files are planned too`);
    if (files.some((file) => file.startsWith('docker/box/')))
      log("WARN: docker/box changed; the box keeps running its image's copy until the image is rebuilt");
    if (target.source === 'github') await logCiResult(target.head, token);

    fs.writeFileSync(APPLYING, JSON.stringify({ sha: target.sha, files, full, at: new Date().toISOString() }));
    await step('checkout', () => {
      run('git', ['checkout', '--force', '--detach', target.sha]);
      if (files.includes('.source')) gitWithToken(token, ['submodule', 'update', '--init', '--depth', '1', '.source']);
    });
    const plan = await step('plan', () => (full ? fullPlan() : planFor(files)));
    log(
      `plan: install ${plan.install ? 'yes' : 'no'}, build ${plan.build.join(' ') || 'nothing'}, restart ${plan.restart.join(' ') || 'nothing'}`
    );
    await applyPlan(plan);

    fs.writeFileSync(
      APPLIED,
      JSON.stringify({ ...target, base, files: files.length, full, at: new Date().toISOString() }, null, 2)
    );
    fs.rmSync(APPLYING);
    writeBoxJson();
    log(`applied ${target.ref} at ${target.sha}`);
  } finally {
    releaseLock();
  }
}

// What a diff needs: new dependencies -> install and restart everything; code -> build the apps nx says are
// affected; files under PATH_PROCESSES -> restart that process. The enterprise packages rebuild only when they or
// the dependencies changed, because nx can't tell (their src links into the nxignored submodule).
function planFor(files) {
  const install = files.some(
    (file) => file === 'pnpm-lock.yaml' || file.endsWith('package.json') || file === '.source'
  );
  const build = affectedApps(files, { install });
  const restart = new Set(install ? CODE_PROCESSES : build.map((project) => PROJECT_PROCESSES[project]));
  for (const [prefix, name] of Object.entries(PATH_PROCESSES))
    if (files.some((file) => file.startsWith(prefix))) restart.add(name);

  return {
    install,
    build,
    enterprise: install || files.some((file) => file.startsWith('enterprise/packages/')),
    restart: runnable(restart),
  };
}

function fullPlan() {
  return {
    install: true,
    build: Object.keys(PROJECT_PROCESSES),
    enterprise: true,
    restart: runnable(new Set(CODE_PROCESSES)),
  };
}

function affectedApps(files, { install }) {
  if (!files.length) return [];
  // Not --base/--head: nx diffs from their merge base, which for two box merge commits is an older bake.
  let apps = JSON.parse(output(NX, ['show', 'projects', '--affected', `--files=${files.join(',')}`, '--json'])).filter(
    (project) => PROJECT_PROCESSES[project]
  );
  if (!install && !dashboardBundleChanged(files)) apps = apps.filter((project) => project !== '@novu/dashboard');
  // nx can't see inside the submodule, so a `.source` bump affects nothing; the enterprise code runs in the API and worker.
  if (files.includes('.source')) apps = [...new Set([...apps, '@novu/api-service', '@novu/worker'])];

  return apps;
}

async function applyPlan({ install, build: projects, enterprise, restart }) {
  // Building next to the running apps gets OOM-killed in 8 GB. The dashboard is static files, so it keeps serving.
  // An apply killed mid-build leaves some of them stopped; `restart` below starts those too.
  const stop = restart.filter((name) => name !== 'dashboard');
  await stopRunning(stop);
  if (install) await step('pnpm install', pnpmInstall);
  if (projects.length) await step(`build ${projects.join(' ')}`, () => build(projects, { enterprise }));
  if (restart.includes('bridge')) await step('build bridge', buildBridge);
  const redeploy = Object.keys(DEPLOYED_APPS).filter((name) => restart.includes(name));
  if (redeploy.length)
    await step(`deploy ${redeploy.join(' ')}`, () => {
      for (const name of redeploy) deployApp(name, { dependenciesChanged: install });
    });
  await step('migrate', migrate);
  if (restart.includes('dashboard')) prepareDashboard();
  if (stop.length)
    await step(`restart ${stop.join(' ')}`, () => {
      for (const name of stop) pc(['process', 'restart', name]);
    });
  await waitForHttp(API_HEALTH, 300);
  // A new framework can discover the same workflows differently (schemas, step options).
  if (restart.includes('bridge')) await step('sync bridge', syncBridge);
}

// The box runs code CI may have rejected (it skips type checks, for one), so it says what CI concluded.
// `PR Checks Passed` is the required check that gates every other job in on-pr.yml.
async function logCiResult(sha, token) {
  const repo = REPO_URL.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  const url = `https://api.github.com/repos/${repo}/commits/${sha}/check-runs?check_name=PR%20Checks%20Passed`;
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const [check] = (await response.json()).check_runs;
    if (!check) log(`CI: no "PR Checks Passed" result for ${sha.slice(0, 10)}`);
    else if (check.status !== 'completed') log(`CI: still running on ${sha.slice(0, 10)}`);
    else if (check.conclusion === 'success') log(`CI: passed on ${sha.slice(0, 10)}`);
    else log(`WARN: CI ${check.conclusion} on ${sha.slice(0, 10)}; the box may run code CI rejects: ${check.html_url}`);
  } catch (error) {
    log(`WARN: couldn't read the CI result: ${error.message}`);
  }
}
