// `box apply`: put a PR, branch, SHA or `box sync` bundle on a running box, and rebuild and restart only what it
// changes. bake builds and deploys with the same steps (build.ts).

import fs from 'node:fs';
import { Effect, Redacted } from 'effect';
import { Applied, Applying, type ApplyPlan, Baked } from '../shared/contracts.ts';
import {
  build,
  buildBridge,
  dashboardBundleChanged,
  deployApp,
  pnpmInstall,
  prepareDashboard,
  writeBoxJson,
} from './build.ts';
import { BoxError } from './errors.ts';
import { fetchRef, gitWithToken, mergeOntoBaked, unbundle } from './git.ts';
import { request } from './http.ts';
import { holdLock } from './lock.ts';
import { migrate } from './migrate.ts';
import { API_HEALTH, APPLIED, APPLYING, BAKED, NX, REPO_URL } from './paths.ts';
import { CODE_PROCESSES, DEPLOYED_APPS, PATH_PROCESSES, PROJECT_PROCESSES } from './processes.ts';
import { BoxEnv, log, poll, readJson, Shell, step, waitForHttp } from './runtime.ts';
import { syncBridge } from './seed.ts';
import { ProcessCompose } from './supervisor.ts';

// Those of `processes` this box runs: thalamus only runs with the managed-agent key (see `box start`).
export const runnable = (processes: Set<string>) =>
  Effect.gen(function* () {
    const { vars } = yield* BoxEnv;
    if (!vars.NOVU_MANAGED_CLAUDE_API_KEY) processes.delete('thalamus');

    return [...processes];
  });

export interface ApplyOptions {
  readonly ref: string | undefined;
  readonly bundle: string | undefined;
  readonly full: boolean;
  readonly token: Redacted.Redacted<string> | undefined;
}

// Puts changes on a running box: a PR, branch or SHA from GitHub, or a bundle from `box sync` (a checkout's
// changes). Either is merged onto the baked commit, then the same steps run: diff against what the box runs, plan,
// build, restart. `--full` plans everything, like a bake, for when the incremental plan is in doubt.
//
// An apply that fails after its checkout leaves APPLYING behind with the files it planned for. The next apply plans
// for those too (and for everything, if that one was --full), so nothing a chain of failed applies half-built stays
// in place.
//
// `token`: the GitHub token for the fetch of the enterprise submodule and the CI lookup, and nothing else.
export const apply = Effect.fn('apply')(function* ({ ref, bundle, full: fullAsked, token }: ApplyOptions) {
  if (!ref === !bundle)
    return yield* new BoxError({ message: 'usage: box apply <pr-number|branch|sha> | --bundle <file> [--full]' });
  const shell = yield* Shell;
  const supervisor = yield* ProcessCompose;
  yield* holdLock('apply');
  // A box that is still starting (woken for this apply) runs its own `migrate`; the plan stops and restarts apps.
  yield* poll(300, supervisor.storesReady, "the stores aren't ready, or migrate didn't finish, after 300s");
  const baked = yield* readJson(BAKED, Baked);
  if (!baked) return yield* new BoxError({ message: 'No golden data in /data. Run `box bake` first.' });
  const base = ((yield* readJson(APPLIED, Applied)) ?? baked).sha;
  const interrupted = yield* readJson(APPLYING, Applying);
  const full = fullAsked || Boolean(interrupted?.full);
  const target = yield* step(
    'fetch',
    Effect.gen(function* () {
      const fetched = bundle ? yield* unbundle(bundle) : { sha: yield* fetchRef(ref ?? ''), subject: ref ?? '' };

      return {
        ref: fetched.subject,
        source: bundle ? ('sync' as const) : ('github' as const),
        head: fetched.sha,
        sha: yield* mergeOntoBaked(fetched.subject, fetched.sha, baked.sha),
      };
    })
  );
  const changed = (to: string) =>
    Effect.map(shell.output('git', ['diff', '--name-only', base, to]), (out) => out.split('\n').filter(Boolean));
  const files = [...new Set([...(yield* changed(target.sha)), ...(interrupted?.files ?? [])])];
  log(`${files.length} files changed between ${base.slice(0, 10)} and ${target.sha.slice(0, 10)}`);
  if (interrupted) log(`the last apply (${interrupted.sha.slice(0, 10)}) didn't finish; its files are planned too`);
  if (files.some((file) => file.startsWith('docker/box/')))
    log("WARN: docker/box changed; the box keeps running its image's copy until the image is rebuilt");
  if (target.source === 'github') yield* logCiResult(target.head, token);

  const applying: Applying = { sha: target.sha, files, full, at: new Date().toISOString() };
  fs.writeFileSync(APPLYING, JSON.stringify(applying));
  yield* step(
    'checkout',
    Effect.gen(function* () {
      yield* shell.run('git', ['checkout', '--force', '--detach', target.sha]);
      if (files.includes('.source'))
        yield* gitWithToken(token, ['submodule', 'update', '--init', '--depth', '1', '.source']);
    })
  );
  const plan = yield* step('plan', full ? fullPlan : planFor(files));
  log(
    `plan: install ${plan.install ? 'yes' : 'no'}, build ${plan.build.join(' ') || 'nothing'}, restart ${plan.restart.join(' ') || 'nothing'}`
  );
  yield* applyPlan(plan);

  const applied: Applied = { ...target, base, files: files.length, full, at: new Date().toISOString() };
  fs.writeFileSync(APPLIED, JSON.stringify(applied, null, 2));
  fs.rmSync(APPLYING);
  yield* writeBoxJson;
  log(`applied ${target.ref} at ${target.sha}`);
}, Effect.scoped);

// What a diff needs: new dependencies -> install and restart everything; code -> build the apps nx says are
// affected; files under PATH_PROCESSES -> restart that process. The enterprise packages rebuild only when they or
// the dependencies changed, because nx can't tell (their src links into the nxignored submodule).
const planFor = Effect.fn('planFor')(function* (files: ReadonlyArray<string>) {
  const install = files.some(
    (file) => file === 'pnpm-lock.yaml' || file.endsWith('package.json') || file === '.source'
  );
  const build = yield* affectedApps(files, install);
  const restart = new Set(install ? CODE_PROCESSES : build.flatMap((project) => PROJECT_PROCESSES[project] ?? []));
  for (const [prefix, name] of Object.entries(PATH_PROCESSES))
    if (files.some((file) => file.startsWith(prefix))) restart.add(name);
  const plan: ApplyPlan = {
    install,
    build,
    enterprise: install || files.some((file) => file.startsWith('enterprise/packages/')),
    restart: yield* runnable(restart),
  };

  return plan;
});

const fullPlan = Effect.gen(function* () {
  const plan: ApplyPlan = {
    install: true,
    build: Object.keys(PROJECT_PROCESSES),
    enterprise: true,
    restart: yield* runnable(new Set(CODE_PROCESSES)),
  };

  return plan;
});

const affectedApps = Effect.fn('affectedApps')(function* (files: ReadonlyArray<string>, install: boolean) {
  if (!files.length) return [];
  const shell = yield* Shell;
  // Not --base/--head: nx diffs from their merge base, which for two box merge commits is an older bake.
  const affected = JSON.parse(
    yield* shell.output(NX, ['show', 'projects', '--affected', `--files=${files.join(',')}`, '--json'])
  ) as Array<string>;
  let apps = affected.filter((project) => PROJECT_PROCESSES[project]);
  if (!install && !(yield* dashboardBundleChanged(files)))
    apps = apps.filter((project) => project !== '@novu/dashboard');
  // nx can't see inside the submodule, so a `.source` bump affects nothing; the enterprise code runs in the API and worker.
  if (files.includes('.source')) apps = [...new Set([...apps, '@novu/api-service', '@novu/worker'])];

  return apps;
});

const applyPlan = Effect.fn('applyPlan')(function* ({ install, build: projects, enterprise, restart }: ApplyPlan) {
  const supervisor = yield* ProcessCompose;
  // Building next to the running apps gets OOM-killed in 8 GB. The dashboard is static files, so it keeps serving.
  // An apply killed mid-build leaves some of them stopped; `restart` below starts those too.
  const stop = restart.filter((name) => name !== 'dashboard');
  yield* supervisor.stopRunning(stop);
  if (install) yield* step('pnpm install', pnpmInstall);
  if (projects.length) yield* step(`build ${projects.join(' ')}`, build(projects, { enterprise }));
  if (restart.includes('bridge')) yield* step('build bridge', buildBridge);
  const redeploy = Object.keys(DEPLOYED_APPS).filter((name) => restart.includes(name));
  if (redeploy.length)
    yield* step(
      `deploy ${redeploy.join(' ')}`,
      Effect.forEach(redeploy, (name) => deployApp(name, { dependenciesChanged: install }), { discard: true })
    );
  yield* step('migrate', migrate);
  if (restart.includes('dashboard')) yield* prepareDashboard;
  if (stop.length)
    yield* step(
      `restart ${stop.join(' ')}`,
      Effect.forEach(stop, (name) => supervisor.pc(['process', 'restart', name]), { discard: true })
    );
  yield* waitForHttp(API_HEALTH, 300);
  // A new framework can discover the same workflows differently (schemas, step options).
  if (restart.includes('bridge')) yield* step('sync bridge', syncBridge);
});

// The box runs code CI may have rejected (it skips type checks, for one), so it says what CI concluded.
// `PR Checks Passed` is the required check that gates every other job in on-pr.yml.
const logCiResult = (sha: string, token: Redacted.Redacted<string> | undefined) =>
  Effect.gen(function* () {
    const repo = REPO_URL.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
    const url = `https://api.github.com/repos/${repo}/commits/${sha}/check-runs?check_name=PR%20Checks%20Passed`;
    const answer = yield* request(url, {
      headers: { Authorization: `Bearer ${token ? Redacted.value(token) : ''}` },
    });
    if (!answer.ok) return yield* new BoxError({ message: `GitHub answered ${answer.status}` });
    const [check] = JSON.parse(answer.text).check_runs as Array<{
      status: string;
      conclusion: string;
      html_url: string;
    }>;
    if (!check) log(`CI: no "PR Checks Passed" result for ${sha.slice(0, 10)}`);
    else if (check.status !== 'completed') log(`CI: still running on ${sha.slice(0, 10)}`);
    else if (check.conclusion === 'success') log(`CI: passed on ${sha.slice(0, 10)}`);
    else log(`WARN: CI ${check.conclusion} on ${sha.slice(0, 10)}; the box may run code CI rejects: ${check.html_url}`);
  }).pipe(Effect.catch((error) => Effect.sync(() => log(`WARN: couldn't read the CI result: ${error.message}`))));
