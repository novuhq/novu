// `box sync`: puts this checkout on the box as the box would put a PR on it. The checkout becomes one commit (HEAD
// plus every change, committed or not, new files included; see `snapshot`), which the box merges onto its baked
// commit. It travels as a git bundle, so it arrives exactly as it is here: binaries, file modes, deletions.

import fs from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import * as z from 'zod';
import { log } from '../node/main.ts';
import { capture, exitCode, output, type RunOptions } from '../node/process.ts';
import { BoxState, fromJson } from '../shared/contracts.ts';
import type { Target } from './target.ts';

const BUNDLE_IN_BOX = '/data/run/sync.bundle';
const SYNC_REF = 'refs/worktree/box-sync';
// Code changes bundle to kilobytes; a bundle this big holds build output or media nobody meant to send.
const MAX_BUNDLE_MB = 25;

type Git = (args: ReadonlyArray<string>, options?: RunOptions) => Promise<string>;

export async function sync(target: Target, { full }: { readonly full: boolean }): Promise<number> {
  await target.ready();
  const root = await output('git', ['rev-parse', '--show-toplevel']);
  const git: Git = (args, options = {}) => output('git', args, { cwd: root, ...options });
  const state = fromJson(BoxState).safeParse(await target.boxOutput(['state']));
  if (!state.success) throw new Error(`the box's state: ${z.prettifyError(state.error)}`);
  const { baked } = state.data;
  if (!baked) throw new Error(`${target.name} isn't baked`);
  if ((await exitCode('git', ['cat-file', '-e', `${baked.sha}^{commit}`], { cwd: root, stdio: 'ignore' })) !== 0) {
    log(`fetching the box's baked commit ${baked.sha.slice(0, 10)}`);
    await git(['fetch', '--no-tags', 'origin', baked.sha]);
  }

  const { commit, changed, summary } = await snapshot(root, git);
  log(summary);
  await mergesOnto(root, baked.sha, commit);
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

// The box merges the commit onto its baked one (src/box/git.ts mergeOntoBaked); a conflict fails here, before the
// upload, with the same check.
async function mergesOnto(root: string, baked: string, commit: string): Promise<void> {
  const options = { cwd: root, stdio: 'ignore' } as const;
  if ((await exitCode('git', ['merge-base', '--is-ancestor', baked, commit], options)) === 0) return;
  const merge = await capture('git', ['merge-tree', '--write-tree', '--name-only', baked, commit], { cwd: root });
  if (merge.exitCode === 1)
    throw new Error(`this checkout conflicts with the box's baked ${baked.slice(0, 10)}; rebase it:\n${merge.stdout}`);
  if (merge.exitCode !== 0) throw new Error(`git merge-tree failed: ${merge.stderr.trim().slice(-600)}`);
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

// The checkout as a commit on HEAD, built in a copy of the index so your own index and staging stay as they are.
// New code starts untracked, so untracked files are sent too, but only inside the top-level folders the repo
// already has (apps, libs, packages, ...). Untracked files elsewhere (scratch folders, tool state, a stray
// screenshot or .env at the root) stay on your machine, and the summary names them. Ignored files are never sent.
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
    // Starting from the real index (when there is one) keeps its file stats, so `add` doesn't re-read every file.
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
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'box sync',
        GIT_AUTHOR_EMAIL: 'box@box.internal',
        GIT_COMMITTER_NAME: 'box sync',
        GIT_COMMITTER_EMAIL: 'box@box.internal',
      },
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
