import fs from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { gitIdentity, mergedTree } from '../node/git.ts';
import { log } from '../node/main.ts';
import { exitCode, output, type RunOptions } from '../node/process.ts';
import { BoxState, decode } from '../shared/contracts.ts';
import type { CloudTarget } from './cloud.ts';

const BUNDLE_IN_BOX = '/data/run/sync.bundle';
const SYNC_REF = 'refs/worktree/box-sync';
const MAX_BUNDLE_MB = 25;

type Git = (args: ReadonlyArray<string>, options?: RunOptions) => Promise<string>;

export async function sync(target: CloudTarget, { full }: { readonly full: boolean }): Promise<number> {
  await target.ready();
  const root = await output('git', ['rev-parse', '--show-toplevel']);
  const git: Git = (args, options = {}) => output('git', args, { cwd: root, ...options });
  const { baked } = decode(BoxState, await target.boxOutput(['state']), "the box's state");
  if (!baked) throw new Error(`${target.name} isn't baked`);
  if ((await exitCode('git', ['cat-file', '-e', `${baked.sha}^{commit}`], { cwd: root, stdio: 'ignore' })) !== 0) {
    log(`fetching the box's baked commit ${baked.sha.slice(0, 10)}`);
    await git(['fetch', '--no-tags', 'origin', baked.sha]);
  }

  const { commit, changed, summary } = await snapshot(root, git);
  log(summary);
  await mergedTree(baked.sha, commit, 'this checkout', { cwd: root });
  const bundle = join(os.tmpdir(), `box-sync-${process.pid}.bundle`);
  try {
    await git(['update-ref', SYNC_REF, commit]);
    await git(['bundle', 'create', '--quiet', bundle, SYNC_REF, `^${baked.sha}`]);
    const kb = fs.statSync(bundle).size / 1024;
    if (kb > MAX_BUNDLE_MB * 1024)
      throw new Error(
        `the sync is ${(kb / 1024).toFixed(0)} MB, over ${MAX_BUNDLE_MB} MB; the biggest changed files: ${biggest(root, changed)}`
      );
    log(`sending ${kb.toFixed(0)} KB to ${target.name}`);
    await target.put(bundle, BUNDLE_IN_BOX);
  } finally {
    fs.rmSync(bundle, { force: true });
    await git(['update-ref', '-d', SYNC_REF]).catch(() => {});
  }

  return target.box(['apply', '--bundle', BUNDLE_IN_BOX, ...(full ? ['--full'] : [])], { github: true });
}

function biggest(root: string, changed: ReadonlyArray<string>): string {
  return changed
    .flatMap((file) => {
      const stat = fs.statSync(join(root, file), { throwIfNoEntry: false });

      return stat?.isFile() ? [{ file, size: stat.size }] : [];
    })
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map(({ file, size }) => `${file} (${(size / 1024 / 1024).toFixed(1)} MB)`)
    .join(', ');
}

async function snapshot(root: string, git: Git) {
  const head = await git(['rev-parse', 'HEAD']);
  const repoFolders = new Set((await git(['ls-tree', '-d', '--name-only', 'HEAD'])).split('\n'));
  const untracked = (await git(['ls-files', '--others', '--exclude-standard'])).split('\n').filter(Boolean);
  const sent = new Set(untracked.filter((file) => file.includes('/') && repoFolders.has(file.split('/')[0] ?? '')));
  const skipped = untracked.filter((file) => !sent.has(file));

  const index = join(os.tmpdir(), `box-sync-${process.pid}.index`);
  const ownIndex = resolve(root, await git(['rev-parse', '--git-path', 'index']));
  const scratch = { env: { ...process.env, GIT_INDEX_FILE: index } };
  try {
    if (fs.existsSync(ownIndex)) fs.copyFileSync(ownIndex, index);
    else await git(['read-tree', head], scratch);
    await git(['add', '--update'], scratch);
    if (sent.size)
      await git(['--literal-pathspecs', 'add', '--pathspec-from-file=-', '--pathspec-file-nul'], {
        ...scratch,
        input: [...sent].join('\0'),
      });
    const tree = await git(['write-tree'], scratch);
    const changed = (await git(['diff', '--name-only', head, tree])).split('\n').filter(Boolean);
    const branch = (await git(['branch', '--show-current'])) || 'a detached HEAD';
    const label = `sync ${branch} at ${head.slice(0, 10)}${changed.length ? ' with uncommitted changes' : ''}`;
    const commit = await git(['commit-tree', tree, '-p', head, '-m', label], {
      env: { ...process.env, ...gitIdentity('box sync') },
    });
    const sentNote = sent.size ? `, ${sent.size} of them untracked: ${[...sent].slice(0, 5).join(' ')}` : '';
    const skippedNote = skipped.length ? `; not sent, outside the repo's folders: ${countByFolder(skipped)}` : '';

    return { commit, changed, summary: `${label}: ${changed.length} files differ from HEAD${sentNote}${skippedNote}` };
  } finally {
    fs.rmSync(index, { force: true });
  }
}

function countByFolder(files: ReadonlyArray<string>): string {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const [folder = ''] = file.split('/');
    counts[folder] = (counts[folder] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([folder, count]) => (count > 1 ? `${folder} (${count} files)` : folder))
    .join(', ');
}
