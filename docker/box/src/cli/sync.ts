// `box sync`: puts this checkout on the box as the box would put a PR on it. The checkout becomes one commit (HEAD
// plus every change, committed or not, new files included; see `snapshot`), which the box merges onto its baked
// commit. It travels as a git bundle, so it arrives exactly as it is here: binaries, file modes, deletions.

import fs from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { Effect, Schema } from 'effect';
import type { ChildProcessSpawner } from 'effect/process';
import { BoxState } from '../shared/contracts.ts';
import { CliError, log, output, type RunOptions, succeeds } from './run.ts';
import { BoxTarget } from './target.ts';

const BUNDLE_IN_BOX = '/data/run/sync.bundle';
const SYNC_REF = 'refs/worktree/box-sync';
// Code changes bundle to kilobytes; a bundle this big holds build output or media nobody meant to send.
const MAX_BUNDLE_MB = 25;

type Git = (
  args: ReadonlyArray<string>,
  options?: RunOptions
) => Effect.Effect<string, CliError, ChildProcessSpawner.ChildProcessSpawner>;

export const sync = Effect.fn('sync')(function* ({ full }: { readonly full: boolean }) {
  const target = yield* BoxTarget;
  yield* target.ready;
  const root = yield* output('git', ['rev-parse', '--show-toplevel']);
  const git: Git = (args, options = {}) => output('git', args, { cwd: root, ...options });
  const { baked } = yield* Effect.flatMap(
    target.boxOutput(['state']),
    Schema.decodeUnknownEffect(Schema.fromJsonString(BoxState))
  ).pipe(Effect.mapError((error) => new CliError({ message: `the box's state: ${error.message}` })));
  if (!baked) return yield* new CliError({ message: `${target.name} isn't baked` });
  if (!(yield* succeeds('git', ['cat-file', '-e', `${baked.sha}^{commit}`], { cwd: root }))) {
    log(`fetching the box's baked commit ${baked.sha.slice(0, 10)}`);
    yield* git(['fetch', '--no-tags', 'origin', baked.sha]);
  }

  const { commit, changed, summary } = yield* snapshot(root, git);
  log(summary);
  const bundle = join(os.tmpdir(), `box-sync-${process.pid}.bundle`);
  yield* Effect.gen(function* () {
    yield* git(['update-ref', SYNC_REF, commit]);
    yield* git(['bundle', 'create', '--quiet', bundle, SYNC_REF, `^${baked.sha}`]);
    const kb = fs.statSync(bundle).size / 1024;
    if (kb > MAX_BUNDLE_MB * 1024) {
      const biggest = changed
        .filter((file) => fs.statSync(join(root, file), { throwIfNoEntry: false })?.isFile())
        .map((file) => [file, fs.statSync(join(root, file)).size] as const)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([file, size]) => `${file} (${(size / 1024 / 1024).toFixed(1)} MB)`);

      return yield* new CliError({
        message: `the sync is ${(kb / 1024).toFixed(0)} MB, over ${MAX_BUNDLE_MB} MB; the biggest changed files: ${biggest.join(', ')}`,
      });
    }
    log(`sending ${kb.toFixed(0)} KB to ${target.name}`);
    yield* target.put(bundle, BUNDLE_IN_BOX);
  }).pipe(
    Effect.ensuring(
      Effect.sync(() => fs.rmSync(bundle, { force: true })).pipe(
        Effect.andThen(Effect.ignore(git(['update-ref', '-d', SYNC_REF])))
      )
    )
  );

  return yield* target.box(['apply', '--bundle', BUNDLE_IN_BOX, ...(full ? ['--full'] : [])], { github: true });
});

// The checkout as a commit on HEAD, built in a copy of the index so your own index and staging stay as they are.
// New code starts untracked, so untracked files are sent too, but only inside the top-level folders the repo
// already has (apps, libs, packages, ...). Untracked files elsewhere (scratch folders, tool state, a stray
// screenshot or .env at the root) stay on your machine, and the summary names them. Ignored files are never sent.
const snapshot = Effect.fn('snapshot')(function* (root: string, git: Git) {
  const head = yield* git(['rev-parse', 'HEAD']);
  const repoFolders = new Set((yield* git(['ls-tree', '-d', '--name-only', 'HEAD'])).split('\n'));
  const untracked = (yield* git(['ls-files', '--others', '--exclude-standard'])).split('\n').filter(Boolean);
  const sent = new Set(untracked.filter((file) => file.includes('/') && repoFolders.has(file.split('/')[0] ?? '')));
  const skipped = untracked.filter((file) => !sent.has(file));

  const index = join(os.tmpdir(), `box-sync-${process.pid}.index`);
  const ownIndex = resolve(root, yield* git(['rev-parse', '--git-path', 'index']));
  const scratch = { env: { ...process.env, GIT_INDEX_FILE: index } };

  return yield* Effect.gen(function* () {
    // Starting from the real index (when there is one) keeps its file stats, so `add` doesn't re-read every file.
    if (fs.existsSync(ownIndex)) fs.copyFileSync(ownIndex, index);
    else yield* git(['read-tree', head], scratch);
    yield* git(['add', '--update'], scratch);
    if (sent.size)
      yield* git(['--literal-pathspecs', 'add', '--pathspec-from-file=-', '--pathspec-file-nul'], {
        ...scratch,
        input: [...sent].join('\0'),
      });
    const tree = yield* git(['write-tree'], scratch);
    const changed = (yield* git(['diff', '--name-only', head, tree])).split('\n').filter(Boolean);
    const branch = (yield* git(['branch', '--show-current'])) || 'a detached HEAD';
    const label = `sync ${branch} at ${head.slice(0, 10)}${changed.length ? ' with uncommitted changes' : ''}`;
    const commit = yield* git(['commit-tree', tree, '-p', head, '-m', label], {
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
  }).pipe(Effect.ensuring(Effect.sync(() => fs.rmSync(index, { force: true }))));
});

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
