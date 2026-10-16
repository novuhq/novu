// git in the checkout: fetching a ref, the token-scoped calls, merging a PR onto the baked commit, a sync bundle.

import { capture, exitCode, output, run, vars } from './runtime.ts';

// The token is only in this git's environment, never on disk, and git's credential helper gives it to github.com
// only. No hooks, so no checked-out code runs with it.
export async function gitWithToken(token: string | undefined, args: ReadonlyArray<string>): Promise<void> {
  if (!token) throw new Error('GITHUB_TOKEN is required to fetch the private enterprise submodule');
  await run(
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
    { env: { ...vars, GITHUB_TOKEN: token } }
  );
}

// `ref`: a PR number, branch, tag or SHA.
export async function fetchRef(ref: string): Promise<string> {
  const refspec = /^\d+$/.test(ref) ? `pull/${ref}/head` : ref;
  await run('git', ['fetch', '--filter=blob:none', 'origin', refspec]);

  return output('git', ['rev-parse', 'FETCH_HEAD']);
}

// A PR runs on top of the baked commit, like CI's merge ref, so a branch cut from an older `next`
// doesn't roll the box back. GitHub's own merge ref can lag behind `next`, so the merge is local.
export async function mergeOntoBaked(ref: string, prHead: string, baked: string): Promise<string> {
  if ((await exitCode('git', ['merge-base', '--is-ancestor', baked, prHead], { stdio: 'ignore' })) === 0) return prHead;
  const merge = await capture('git', ['merge-tree', '--write-tree', baked, prHead]);
  if (merge.exitCode !== 0)
    throw new Error(`${ref} conflicts with the baked ${baked.slice(0, 10)}; rebase it:\n${merge.stdout}`);
  const identity = {
    GIT_AUTHOR_NAME: 'box',
    GIT_AUTHOR_EMAIL: 'box@box.internal',
    GIT_COMMITTER_NAME: 'box',
    GIT_COMMITTER_EMAIL: 'box@box.internal',
  };
  const [tree = ''] = merge.stdout.split('\n');

  return output('git', ['commit-tree', tree, '-p', baked, '-p', prHead, '-m', `box: ${ref} on ${baked.slice(0, 10)}`], {
    env: { ...vars, ...identity },
  });
}

// A bundle from `box sync` holds one commit: a snapshot of a checkout, committed or not, on top of its HEAD.
// Its prerequisites are in the baked commit's history, which the box always has.
export async function unbundle(file: string): Promise<{ sha: string; subject: string }> {
  const [head = '', ...others] = (await output('git', ['bundle', 'unbundle', file])).split('\n');
  if (others.length) throw new Error(`${file} has ${others.length + 1} heads; expected the one from box sync`);
  const [sha = ''] = head.split(' ');

  return { sha, subject: await output('git', ['log', '-1', '--format=%s', sha]) };
}
