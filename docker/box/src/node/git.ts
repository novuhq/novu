import { capture, exitCode, type RunOptions } from './process.ts';

export const gitIdentity = (name: string) => ({
  GIT_AUTHOR_NAME: name,
  GIT_AUTHOR_EMAIL: 'box@box.internal',
  GIT_COMMITTER_NAME: name,
  GIT_COMMITTER_EMAIL: 'box@box.internal',
});

export async function mergedTree(
  baked: string,
  head: string,
  what: string,
  options: RunOptions
): Promise<string | null> {
  if ((await exitCode('git', ['merge-base', '--is-ancestor', baked, head], { ...options, stdio: 'ignore' })) === 0)
    return null;
  const merge = await capture('git', ['merge-tree', '--write-tree', '--name-only', baked, head], options);
  const [tree = '', ...files] = merge.stdout.split('\n');
  if (merge.exitCode === 0) return tree;
  // It exits 1 both for a conflict (after the tree it would write) and for a ref it can't merge.
  if (merge.exitCode === 1 && tree)
    throw new Error(`${what} conflicts with the baked ${baked.slice(0, 10)}; rebase it:\n${files.join('\n')}`);
  throw new Error(`git merge-tree failed: ${merge.stderr.trim().slice(-600)}`);
}
