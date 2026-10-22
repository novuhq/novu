import fs from 'node:fs';
import { fetchJson } from '../node/http.ts';
import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import { Applied, Applying, Baked, CheckRuns, fromJson, NxProjects } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { syncBridge } from './bridge.ts';
import {
  build,
  buildBridge,
  type Changes,
  dashboardBundleChanged,
  deployApp,
  dropNxCache,
  pnpmInstall,
  prepareDashboard,
  writeBoxJson,
} from './build.ts';
import { fetchRef, gitWithToken, mergeOntoBaked, unbundle } from './git.ts';
import { withLock } from './lock.ts';
import { migrate } from './migrate.ts';
import { API_HEALTH, APPLIED, APPLYING, BAKED, NX, REPO_URL } from './paths.ts';
import { CODE_PROCESSES, DEPLOYED_APPS, PATH_PROCESSES, PROJECT_PROCESSES } from './processes.ts';
import { allSettled, output, readJson, run, step, vars, waitForHttp } from './runtime.ts';
import { pc, startSkipped, stopRunning, storesReady } from './supervisor.ts';

export function runnable(processes: Iterable<string>): Array<string> {
  return [...processes].filter((name) => name !== 'thalamus' || vars.NOVU_MANAGED_CLAUDE_API_KEY);
}

interface ApplyPlan {
  readonly install: boolean;
  readonly build: ReadonlyArray<string>;
  readonly enterprise: boolean;
  readonly restart: ReadonlyArray<string>;
  readonly changes: Changes | undefined;
}

export interface ApplyOptions {
  readonly ref: string | undefined;
  readonly bundle: string | undefined;
  readonly full: boolean;
  readonly baseline: boolean;
  readonly token: string | undefined;
}

export async function apply(options: ApplyOptions): Promise<void> {
  if (!options.ref === !options.bundle || (options.baseline && options.bundle))
    throw new Error('usage: box apply <pr-number|branch|sha> [--baseline] | --bundle <file> [--full]');
  await withLock('apply', () => applyLocked(options));
}

async function applyLocked({ ref = '', bundle, full: fullAsked, baseline, token }: ApplyOptions): Promise<void> {
  await poll(storesReady, { timeoutMs: 300_000, what: "the stores aren't ready, or migrate didn't finish," });
  const baked = readJson(BAKED, Baked);
  if (!baked) throw new Error('No golden data in /data. Run `box bake` first.');
  const base = (readJson(APPLIED, Applied) ?? baked).sha;
  const interrupted = readJson(APPLYING, Applying);
  const full = fullAsked || Boolean(interrupted?.full);
  const target = await step('fetch', async () => {
    const fetched = bundle ? await unbundle(bundle) : { sha: await fetchRef(ref), subject: ref };

    return {
      ref: fetched.subject,
      source: bundle ? ('sync' as const) : ('github' as const),
      head: fetched.sha,
      sha: await mergeOntoBaked(fetched.subject, fetched.sha, baked.sha),
    };
  });
  if (baseline && target.sha !== target.head)
    throw new Error(`${target.ref} doesn't contain the baked ${baked.sha.slice(0, 10)}; bake the box again instead`);
  const files = [...new Set([...(await changedFiles(base, target.sha)), ...(interrupted?.files ?? [])])];
  log(`${files.length} files changed between ${base.slice(0, 10)} and ${target.sha.slice(0, 10)}`);
  if (interrupted) log(`the last apply (${interrupted.sha.slice(0, 10)}) didn't finish; its files are planned too`);
  if (files.some((file) => file.startsWith('docker/box/')))
    log("WARN: docker/box changed; the box keeps running its image's copy until the image is rebuilt");
  if (target.source === 'github') await logCiResult(target.head, token);

  const applying: Applying = { sha: target.sha, files, full, at: new Date().toISOString() };
  fs.writeFileSync(APPLYING, JSON.stringify(applying));
  await step('checkout', async () => {
    await run('git', ['checkout', '--force', '--detach', target.sha]);
    if (files.includes('.source'))
      await gitWithToken(token, ['submodule', 'update', '--init', '--depth', '1', '.source']);
  });
  const plan = await step('plan', () =>
    full ? Promise.resolve(fullPlan()) : planFor(files, base, target.sha, Boolean(interrupted))
  );
  const listed = (names: ReadonlyArray<string>) => names.join(' ') || 'nothing';
  log(`plan: install ${plan.install ? 'yes' : 'no'}, build ${listed(plan.build)}, restart ${listed(plan.restart)}`);
  await applyPlan(plan);

  if (baseline) {
    await step('drop the nx cache', dropNxCache);
    // Later applies, and boxes started from this one's snapshot, merge onto this commit instead of the bake's; `at`
    // stays the bake's time.
    const refreshed: Baked = { ref: target.ref, sha: target.sha, at: baked.at };
    fs.writeFileSync(BAKED, JSON.stringify(refreshed, null, 2));
    fs.rmSync(APPLIED, { force: true });
  } else {
    const applied: Applied = { ...target, base, files: files.length, full, at: new Date().toISOString() };
    fs.writeFileSync(APPLIED, JSON.stringify(applied, null, 2));
  }
  fs.rmSync(APPLYING);
  writeBoxJson();
  log(`applied ${target.ref} at ${target.sha}`);
}

// A dependency change always changes the lockfile (installs are frozen); the deploy refresh copies a changed
// package.json.
const INSTALL_FILES = ['pnpm-lock.yaml', 'pnpm-workspace.yaml', '.source'];

async function planFor(
  files: ReadonlyArray<string>,
  from: string,
  to: string,
  interrupted: boolean
): Promise<ApplyPlan> {
  if (files.some((file) => INSTALL_FILES.includes(file))) return fullPlan();
  const affected = await affectedProjects(files);
  const build = await appsToBuild(files, affected);
  const restart = new Set(build.flatMap((project) => PROJECT_PROCESSES[project] ?? []));
  for (const [prefix, name] of Object.entries(PATH_PROCESSES))
    if (files.some((file) => file.startsWith(prefix))) restart.add(name);
  const changes = interrupted
    ? undefined
    : { files, affected, modified: new Set(await changedFiles(from, to, ['--diff-filter=M'])) };

  return {
    install: false,
    build,
    enterprise: files.some((file) => file.startsWith('enterprise/packages/')),
    restart: runnable(restart),
    changes,
  };
}

function fullPlan(): ApplyPlan {
  return {
    install: true,
    build: Object.keys(PROJECT_PROCESSES),
    enterprise: true,
    restart: runnable(CODE_PROCESSES),
    changes: undefined,
  };
}

async function changedFiles(from: string, to: string, options: ReadonlyArray<string> = []): Promise<Array<string>> {
  return (await output('git', ['diff', '--name-only', ...options, from, to])).split('\n').filter(Boolean);
}

async function affectedProjects(files: ReadonlyArray<string>): Promise<Array<string>> {
  if (!files.length) return [];
  // Not --base/--head: nx diffs from their merge base, which for two box merge commits is an older bake.
  return fromJson(NxProjects).parse(
    await output(NX, ['show', 'projects', '--affected', `--files=${files.join(',')}`, '--json'])
  );
}

async function appsToBuild(files: ReadonlyArray<string>, affected: ReadonlyArray<string>): Promise<Array<string>> {
  const apps = affected.filter((project) => PROJECT_PROCESSES[project]);

  return (await dashboardBundleChanged(files)) ? apps : apps.filter((project) => project !== '@novu/dashboard');
}

async function applyPlan({ install, build: projects, enterprise, restart, changes }: ApplyPlan) {
  const stoppedDuringBuild = restart.filter((name) => name !== 'dashboard');
  await stopRunning(stoppedDuringBuild);
  if (install) await step('pnpm install', pnpmInstall);
  if (projects.length) await step(`build ${projects.join(' ')}`, () => build(projects, { enterprise, changes }));
  if (restart.includes('bridge')) await step('build bridge', buildBridge);
  const redeploy = Object.keys(DEPLOYED_APPS).filter((name) => restart.includes(name));
  const workspaceChanged = !changes || changes.files.some((file) => !file.startsWith('apps/'));
  if (redeploy.length)
    await step(`deploy ${redeploy.join(' ')}`, () =>
      allSettled(redeploy.map((name) => deployApp(name, { dependenciesChanged: install, workspaceChanged })))
    );
  await step('migrate', migrate);
  if (restart.includes('dashboard')) prepareDashboard();
  if (stoppedDuringBuild.length)
    await step(`restart ${stoppedDuringBuild.join(' ')}`, async () => {
      for (const name of stoppedDuringBuild) await pc(['process', 'restart', name]);
    });
  await waitForHttp(API_HEALTH, 300);
  await startSkipped();
  if (restart.includes('bridge')) await step('sync bridge', syncBridge);
}

async function logCiResult(sha: string, token: string | undefined): Promise<void> {
  const repo = REPO_URL.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  const url = `https://api.github.com/repos/${repo}/commits/${sha}/check-runs?check_name=PR%20Checks%20Passed`;
  try {
    const [check] = (await fetchJson(url, CheckRuns, { headers: { Authorization: `Bearer ${token ?? ''}` } }))
      .check_runs;
    if (!check) log(`CI: no "PR Checks Passed" result for ${sha.slice(0, 10)}`);
    else if (check.status !== 'completed') log(`CI: still running on ${sha.slice(0, 10)}`);
    else if (check.conclusion === 'success') log(`CI: passed on ${sha.slice(0, 10)}`);
    else log(`WARN: CI ${check.conclusion} on ${sha.slice(0, 10)}; the box may run code CI rejects: ${check.html_url}`);
  } catch (error) {
    log(`WARN: couldn't read the CI result: ${messageOf(error)}`);
  }
}
