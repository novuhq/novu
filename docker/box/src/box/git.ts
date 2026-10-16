// git in the checkout: fetching a ref, the token-scoped calls, merging a PR onto the baked commit, a sync bundle.

import { Effect, Redacted } from 'effect';
import { BoxError } from './errors.ts';
import { BoxEnv, Shell } from './runtime.ts';

// The token is only in this git's environment, never on disk, and git's credential helper gives it to github.com
// only. No hooks, so no checked-out code runs with it.
export const gitWithToken = Effect.fn('gitWithToken')(function* (
  token: Redacted.Redacted<string> | undefined,
  args: ReadonlyArray<string>
) {
  if (!token)
    return yield* new BoxError({ message: 'GITHUB_TOKEN is required to fetch the private enterprise submodule' });
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  yield* shell.run(
    'git',
    [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'url.https://github.com/.insteadOf=git@github.com:',
      '-c',
      'credential.helper=',
      '-c',
      'credential.https://github.com.helper=!f() { echo username=x-access-token; echo "password=$GITHUB_TOKEN"; }; f',
      ...args,
    ],
    { env: { ...vars, GITHUB_TOKEN: Redacted.value(token) } }
  );
});

// `ref`: a PR number, branch, tag or SHA.
export const fetchRef = Effect.fn('fetchRef')(function* (ref: string) {
  const shell = yield* Shell;
  const refspec = /^\d+$/.test(ref) ? `pull/${ref}/head` : ref;
  yield* shell.run('git', ['fetch', '--filter=blob:none', 'origin', refspec]);

  return yield* shell.output('git', ['rev-parse', 'FETCH_HEAD']);
});

// A PR runs on top of the baked commit, like CI's merge ref, so a branch cut from an older `next`
// doesn't roll the box back. GitHub's own merge ref can lag behind `next`, so the merge is local.
export const mergeOntoBaked = Effect.fn('mergeOntoBaked')(function* (ref: string, prHead: string, baked: string) {
  const shell = yield* Shell;
  const { vars } = yield* BoxEnv;
  if ((yield* shell.exitCode('git', ['merge-base', '--is-ancestor', baked, prHead], { stdio: 'ignore' })) === 0)
    return prHead;
  const merge = yield* shell.capture('git', ['merge-tree', '--write-tree', baked, prHead]);
  if (merge.exitCode !== 0)
    return yield* new BoxError({
      message: `${ref} conflicts with the baked ${baked.slice(0, 10)}; rebase it:\n${merge.stdout}`,
    });
  const identity = {
    GIT_AUTHOR_NAME: 'box',
    GIT_AUTHOR_EMAIL: 'box@box.internal',
    GIT_COMMITTER_NAME: 'box',
    GIT_COMMITTER_EMAIL: 'box@box.internal',
  };
  const [tree = ''] = merge.stdout.split('\n');

  return yield* shell.output(
    'git',
    ['commit-tree', tree, '-p', baked, '-p', prHead, '-m', `box: ${ref} on ${baked.slice(0, 10)}`],
    { env: { ...vars, ...identity } }
  );
});

// A bundle from `box sync` holds one commit: a snapshot of a checkout, committed or not, on top of its HEAD.
// Its prerequisites are in the baked commit's history, which the box always has.
export const unbundle = Effect.fn('unbundle')(function* (file: string) {
  const shell = yield* Shell;
  const [head = '', ...others] = (yield* shell.output('git', ['bundle', 'unbundle', file])).split('\n');
  if (others.length)
    return yield* new BoxError({ message: `${file} has ${others.length + 1} heads; expected the one from box sync` });
  const [sha = ''] = head.split(' ');

  return { sha, subject: yield* shell.output('git', ['log', '-1', '--format=%s', sha]) };
});
