import { posix } from 'node:path';
import type { UploadSkillFile } from '@novu/application-generic';
import { Parser } from 'tar';

export type ParsedGithubUrl = {
  owner: string;
  repo: string;
  /** Git ref (branch, tag, or SHA) — `HEAD` when the URL doesn't specify one. */
  ref: string;
  /** POSIX path inside the repo, without leading or trailing slashes. Empty string for repo root. */
  subPath: string;
};

/** Hard cap on extracted skill bundle size (per request) to bound memory usage. */
// Maximum allowed skill bundle size is 5 MB (5 * 1024 * 1024 bytes)
const MAX_SKILL_BUNDLE_BYTES = 5 * 1024 * 1024;

/** A single request may not extract more than this many file entries across all bundles. */
const MAX_SKILL_BUNDLE_ENTRIES = 500;

/** Charset for `owner` and `repo` segments in the `github-repo` form. */
const REPO_SLUG_REGEX = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

export type DiscoveredSkillBundle = {
  /** Files inside the bundle, paths relative to the bundle's root directory. */
  files: UploadSkillFile[];
  /** Bundle's directory path inside the repo (POSIX), or empty string for repo-root bundles. */
  path: string;
  /** Value of the `name:` field in SKILL.md frontmatter, or `null` when missing/malformed. */
  name: string | null;
};

/**
 * Validates a `github-repo` slug (`owner/repo`) and returns the segmented pieces.
 *
 * The slug must match `owner/repo` exactly — no host prefix, no `.git` suffix,
 * no `/tree/{ref}/...` path. The character set is restricted to alphanumerics
 * plus `.`, `_`, and `-`, which excludes path-traversal sequences (`..`,
 * leading `.`) and whitespace.
 *
 * Throws `Error` with a user-facing message on malformed input — callers should
 * wrap in a `BadRequestException`.
 */
export function assertRepoSlug(input: string): { owner: string; repo: string } {
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error('Repository slug must be a non-empty string.');
  }

  const trimmed = input.trim();

  if (!REPO_SLUG_REGEX.test(trimmed)) {
    throw new Error(
      'Repository slug must be in `owner/repo` form using only alphanumerics, `-`, `.`, and `_` (no host, no `.git` suffix, no path).'
    );
  }

  const [owner, repo] = trimmed.split('/');

  if (owner === '..' || repo === '..' || owner === '.' || repo === '.') {
    throw new Error('Repository slug may not contain `.` or `..` segments.');
  }

  return { owner, repo };
}

/**
 * Accepts the following URL forms:
 *   - https://github.com/{owner}/{repo}
 *   - https://github.com/{owner}/{repo}.git
 *   - https://github.com/{owner}/{repo}/tree/{ref}
 *   - https://github.com/{owner}/{repo}/tree/{ref}/{subPath...}
 *
 * Returns a normalized `{ owner, repo, ref, subPath }` tuple. `ref` defaults to `'HEAD'`
 * (resolved server-side by GitHub's tarball endpoint) and `subPath` defaults to `''`.
 *
 * Throws `Error` with a user-facing message on malformed input — callers should wrap
 * in a `BadRequestException`.
 */
export function parseGithubUrl(input: string): ParsedGithubUrl {
  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Invalid URL.');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    throw new Error('URL must be an https://github.com/... repository link.');
  }

  const segments = parsed.pathname.split('/').filter((s) => s.length > 0);

  if (segments.length < 2) {
    throw new Error('URL must include both an owner and a repository name.');
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');

  if (segments.length === 2) {
    return { owner, repo, ref: 'HEAD', subPath: '' };
  }

  if (segments[2] !== 'tree') {
    throw new Error('Only repository root or `/tree/{ref}/{path}` URLs are supported.');
  }

  if (segments.length < 4) {
    throw new Error('URL is missing a ref after `/tree/`.');
  }

  const ref = decodeURIComponent(segments[3]);
  const subPath = segments
    .slice(4)
    .map((s) => decodeURIComponent(s))
    .join('/');

  return { owner, repo, ref, subPath: normalizeSubPath(subPath) };
}

function normalizeSubPath(subPath: string): string {
  const trimmed = subPath.replace(/^\/+|\/+$/g, '');

  if (trimmed.length === 0) {
    return '';
  }

  const normalized = posix.normalize(trimmed);

  if (normalized.startsWith('..') || normalized.includes('/../') || normalized === '..') {
    throw new Error('Sub-path may not contain `..` segments.');
  }

  return normalized;
}

export function buildGithubTarballUrl(parsed: ParsedGithubUrl): string {
  return `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/tarball/${encodeURIComponent(parsed.ref)}`;
}

/** Anthropic caps `display_title` at 64 chars. */
const MAX_SKILL_DISPLAY_TITLE_LENGTH = 64;

/**
 * Derives a short, human-readable display title from a parsed GitHub URL.
 *
 * Format: `${owner}-${basename(subPath) || repo}`, e.g.
 *   - `samber/cc-skills-golang/tree/main/skills/golang-benchmark` → `samber-golang-benchmark`
 *   - `anthropics/skills/tree/main/document-skills/pdf`          → `anthropics-pdf`
 *   - `foo/my-skill` (repo root)                                  → `foo-my-skill`
 *
 * Result is truncated with an ellipsis to satisfy Anthropic's 64-char
 * `display_title` limit when owner/repo/path names are unusually long.
 */
export function buildSkillDisplayTitle(parsed: ParsedGithubUrl): string {
  const name = parsed.subPath.length > 0 ? posix.basename(parsed.subPath) : parsed.repo;

  return truncateWithEllipsis(`${parsed.owner}-${name}`, MAX_SKILL_DISPLAY_TITLE_LENGTH);
}

/**
 * Derives a display title for a `github-repo` bundle.
 *
 * Format: `${owner}-${basename(path) || repo}`, mirroring {@link buildSkillDisplayTitle}.
 * Repo-root bundles (empty path) fall back to the repository name.
 */
export function buildRepoSkillDisplayTitle(owner: string, repo: string, path: string): string {
  const name = path.length > 0 ? posix.basename(path) : repo;

  return truncateWithEllipsis(`${owner}-${name}`, MAX_SKILL_DISPLAY_TITLE_LENGTH);
}

/**
 * Returns `value` unchanged if it already fits within `max` characters; otherwise
 * trims it and appends a single-character ellipsis `…` so the final string is
 * exactly `max` characters long.
 */
function truncateWithEllipsis(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

/**
 * Downloads a GitHub repository tarball. Public repos only.
 *
 * Throws `Error` with a user-facing message on non-2xx status; callers should wrap
 * in a `BadRequestException`.
 */
export async function downloadGithubTarball(parsed: ParsedGithubUrl): Promise<Buffer> {
  const url = buildGithubTarballUrl(parsed);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'novu-agents-skill-uploader',
      Accept: 'application/vnd.github+json',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`GitHub repository or ref not found (${parsed.owner}/${parsed.repo}@${parsed.ref}).`);
    }

    throw new Error(`Failed to download GitHub tarball (HTTP ${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

/**
 * Parses a gzipped tar archive (as returned by GitHub's tarball endpoint) and returns
 * the regular files at — and below — `subPath` relative to the archive's top-level
 * directory. The top-level directory itself is stripped from each returned `path`.
 *
 * Validates that `SKILL.md` exists at the resolved root.
 */
export async function extractSkillBundle(tarball: Buffer, subPath: string): Promise<UploadSkillFile[]> {
  const collected: UploadSkillFile[] = [];
  let totalBytes = 0;
  let topLevelDir: string | null = null;
  let aborted: Error | null = null;

  const targetSubPath = subPath.replace(/^\/+|\/+$/g, '');

  await new Promise<void>((resolve, reject) => {
    const parser = new Parser();

    const fail = (error: Error) => {
      if (!aborted) {
        aborted = error;
      }
      try {
        parser.abort?.(error);
      } catch {
        // ignore — abort is best-effort
      }
      reject(error);
    };

    parser.on('entry', (entry: NodeJS.ReadableStream & { path: string; type?: string; size?: number }) => {
      if (aborted) {
        entry.resume();

        return;
      }

      const isFile = entry.type === undefined || entry.type === 'File';

      if (!isFile) {
        entry.resume();

        return;
      }

      const entryPath = posix.normalize(entry.path);

      if (entryPath.startsWith('/') || entryPath.startsWith('..') || entryPath.includes('/../')) {
        fail(new Error(`Skill bundle entry has unsafe path: ${entry.path}`));
        entry.resume();

        return;
      }

      const firstSlash = entryPath.indexOf('/');
      const entryTopDir = firstSlash === -1 ? entryPath : entryPath.slice(0, firstSlash);

      if (topLevelDir === null) {
        topLevelDir = entryTopDir;
      } else if (entryTopDir !== topLevelDir) {
        // GitHub tarballs always have a single top-level dir; bail on a malformed archive.
        fail(new Error('Skill bundle archive must have a single top-level directory.'));
        entry.resume();

        return;
      }

      const prefix = targetSubPath.length > 0 ? `${topLevelDir}/${targetSubPath}/` : `${topLevelDir}/`;

      if (!entryPath.startsWith(prefix)) {
        entry.resume();

        return;
      }

      const relativePath = entryPath.slice(prefix.length);

      if (relativePath.length === 0) {
        entry.resume();

        return;
      }

      if (collected.length >= MAX_SKILL_BUNDLE_ENTRIES) {
        fail(new Error(`Skill bundle exceeds the maximum of ${MAX_SKILL_BUNDLE_ENTRIES} files.`));
        entry.resume();

        return;
      }

      const chunks: Buffer[] = [];

      entry.on('data', (chunk: Buffer) => {
        if (aborted) return;
        totalBytes += chunk.length;

        if (totalBytes > MAX_SKILL_BUNDLE_BYTES) {
          fail(new Error(`Skill bundle exceeds the maximum size of ${MAX_SKILL_BUNDLE_BYTES} bytes.`));

          return;
        }

        chunks.push(chunk);
      });

      entry.on('end', () => {
        if (aborted) return;
        collected.push({ path: relativePath, content: Buffer.concat(chunks) });
      });

      entry.on('error', (err: Error) => fail(err));
    });

    parser.on('error', (err: Error) => fail(err));
    parser.on('end', () => {
      if (!aborted) resolve();
    });

    parser.end(tarball);
  });

  if (collected.length === 0) {
    throw new Error(
      targetSubPath.length > 0
        ? `No files found at "${targetSubPath}" in the GitHub repository.`
        : 'No files found in the GitHub repository.'
    );
  }

  if (!collected.some((f) => f.path === 'SKILL.md')) {
    throw new Error('Skill bundle must contain a SKILL.md file at its root.');
  }

  return collected;
}

type RawTarEntry = {
  /** Path inside the archive's top-level directory (top-level prefix already stripped). */
  repoPath: string;
  content: Buffer;
};

/**
 * Discovers every skill bundle in a GitHub tarball.
 *
 * A "skill bundle" is any directory inside the repo that contains a `SKILL.md`
 * file directly. The repo root is also treated as a bundle when a top-level
 * `SKILL.md` is present.
 *
 * Each file in the tarball is assigned to its deepest matching bundle:
 *   `parent/SKILL.md` and `parent/lib/x.ts` → bundle `parent`
 *   `parent/nested/SKILL.md`                → bundle `parent/nested`
 *   `parent/nested/helpers.py`              → bundle `parent/nested`
 * This means nested SKILL.md files don't pollute the parent bundle's file list.
 *
 * When `opts.basenames` is supplied, the returned list is filtered to bundles
 * whose directory basename matches one of the supplied names:
 *   - 0 matches for a name           → throws (listing available skills)
 *   - multiple matches for a name    → throws (listing conflicting paths)
 *   - duplicates in `basenames`      → silently deduplicated
 *   - result order                   → matches the order of `basenames`
 *
 * When `opts.basenames` is omitted or empty, every discovered bundle is
 * returned, sorted by path for determinism.
 *
 * Throws `Error` with user-facing messages on validation failures — callers
 * should wrap in `BadRequestException`.
 */
export async function discoverSkillBundles(
  tarball: Buffer,
  opts: { basenames?: string[] } = {}
): Promise<DiscoveredSkillBundle[]> {
  const entries: RawTarEntry[] = [];
  let totalBytes = 0;
  let topLevelDir: string | null = null;
  let aborted: Error | null = null;

  await new Promise<void>((resolve, reject) => {
    const parser = new Parser();

    const fail = (error: Error) => {
      if (!aborted) {
        aborted = error;
      }
      try {
        parser.abort?.(error);
      } catch {
        // ignore — abort is best-effort
      }
      reject(error);
    };

    parser.on('entry', (entry: NodeJS.ReadableStream & { path: string; type?: string; size?: number }) => {
      if (aborted) {
        entry.resume();

        return;
      }

      const isFile = entry.type === undefined || entry.type === 'File';

      if (!isFile) {
        entry.resume();

        return;
      }

      const entryPath = posix.normalize(entry.path);

      if (entryPath.startsWith('/') || entryPath.startsWith('..') || entryPath.includes('/../')) {
        fail(new Error(`Skill bundle entry has unsafe path: ${entry.path}`));
        entry.resume();

        return;
      }

      const firstSlash = entryPath.indexOf('/');
      const entryTopDir = firstSlash === -1 ? entryPath : entryPath.slice(0, firstSlash);

      if (topLevelDir === null) {
        topLevelDir = entryTopDir;
      } else if (entryTopDir !== topLevelDir) {
        fail(new Error('Skill bundle archive must have a single top-level directory.'));
        entry.resume();

        return;
      }

      if (entries.length >= MAX_SKILL_BUNDLE_ENTRIES) {
        fail(new Error(`Skill bundle exceeds the maximum of ${MAX_SKILL_BUNDLE_ENTRIES} files.`));
        entry.resume();

        return;
      }

      // Path relative to the top-level dir (e.g. `skills/golang-benchmark/SKILL.md`).
      // Files that ARE the top-level dir entry itself (no slash) are skipped.
      const repoPath = firstSlash === -1 ? '' : entryPath.slice(firstSlash + 1);

      if (repoPath.length === 0) {
        entry.resume();

        return;
      }

      const chunks: Buffer[] = [];

      entry.on('data', (chunk: Buffer) => {
        if (aborted) return;
        totalBytes += chunk.length;

        if (totalBytes > MAX_SKILL_BUNDLE_BYTES) {
          fail(new Error(`Skill bundle exceeds the maximum size of ${MAX_SKILL_BUNDLE_BYTES} bytes.`));

          return;
        }

        chunks.push(chunk);
      });

      entry.on('end', () => {
        if (aborted) return;
        entries.push({ repoPath, content: Buffer.concat(chunks) });
      });

      entry.on('error', (err: Error) => fail(err));
    });

    parser.on('error', (err: Error) => fail(err));
    parser.on('end', () => {
      if (!aborted) resolve();
    });

    parser.end(tarball);
  });

  if (entries.length === 0) {
    throw new Error('No files found in the GitHub repository.');
  }

  // Set of bundle root paths: directories that contain a SKILL.md directly.
  // `''` means the repo root (top-level SKILL.md).
  const bundleRoots = new Set<string>();

  for (const entry of entries) {
    if (posix.basename(entry.repoPath) === 'SKILL.md') {
      const parent = posix.dirname(entry.repoPath);
      bundleRoots.add(parent === '.' ? '' : parent);
    }
  }

  if (bundleRoots.size === 0) {
    throw new Error('No skill bundles found — the repository contains no `SKILL.md` files.');
  }

  const sortedRoots = Array.from(bundleRoots).sort();

  // For each entry, find the deepest bundle root that owns it.
  const bundles = new Map<string, UploadSkillFile[]>();

  for (const root of sortedRoots) {
    bundles.set(root, []);
  }

  for (const entry of entries) {
    const owningRoot = findDeepestBundleRoot(entry.repoPath, sortedRoots);

    if (owningRoot === null) {
      continue;
    }

    const relativePath = owningRoot === '' ? entry.repoPath : entry.repoPath.slice(owningRoot.length + 1);

    bundles.get(owningRoot)?.push({ path: relativePath, content: entry.content });
  }

  const discovered: DiscoveredSkillBundle[] = sortedRoots
    .map((path) => {
      const files = bundles.get(path) ?? [];
      const skillMd = files.find((f) => f.path === 'SKILL.md');
      const name = skillMd ? parseSkillNameFromFrontmatter(skillMd.content.toString('utf8')) : null;

      return { path, files, name };
    })
    .filter((b) => b.files.length > 0);

  if (discovered.length === 0) {
    throw new Error('No skill bundles found — the repository contains no `SKILL.md` files.');
  }

  if (!opts.basenames || opts.basenames.length === 0) {
    return discovered;
  }

  return filterByBasenames(discovered, opts.basenames);
}

function findDeepestBundleRoot(entryPath: string, sortedRoots: string[]): string | null {
  let deepest: string | null = null;

  for (const root of sortedRoots) {
    if (root === '') {
      if (deepest === null) {
        deepest = root;
      }
      continue;
    }

    if (entryPath === root || entryPath.startsWith(`${root}/`)) {
      if (deepest === null || root.length > deepest.length) {
        deepest = root;
      }
    }
  }

  return deepest;
}

function filterByBasenames(discovered: DiscoveredSkillBundle[], basenames: string[]): DiscoveredSkillBundle[] {
  const basenameToPaths = new Map<string, string[]>();

  for (const bundle of discovered) {
    const base = bundle.path === '' ? '' : posix.basename(bundle.path);
    const existing = basenameToPaths.get(base);

    if (existing) {
      existing.push(bundle.path);
    } else {
      basenameToPaths.set(base, [bundle.path]);
    }
  }

  const result: DiscoveredSkillBundle[] = [];
  const seen = new Set<string>();
  const availableNames = Array.from(basenameToPaths.keys())
    .filter((name) => name.length > 0)
    .sort();

  for (const rawName of basenames) {
    const name = typeof rawName === 'string' ? rawName.trim() : '';

    if (name.length === 0) {
      throw new Error('Skill basenames may not be empty strings.');
    }

    if (seen.has(name)) {
      continue;
    }
    seen.add(name);

    const paths = basenameToPaths.get(name);

    if (!paths || paths.length === 0) {
      const available = availableNames.length > 0 ? availableNames.join(', ') : '(none)';
      throw new Error(`Skill "${name}" was not found in the repository. Available skills: ${available}.`);
    }

    if (paths.length > 1) {
      throw new Error(
        `Skill basename "${name}" is ambiguous — it matches multiple directories: ${paths.join(', ')}. ` +
          'Use `type: "github-url"` with a `/tree/{ref}/{path}` URL to select a specific one.'
      );
    }

    const bundle = discovered.find((b) => b.path === paths[0]);

    if (bundle) {
      result.push(bundle);
    }
  }

  return result;
}

/**
 * Reads the `name` field from the YAML frontmatter of a SKILL.md document.
 *
 * Intentionally narrow — only handles the simple `key: value` shape we expect
 * for `name`; anything richer (quoted strings, multi-line scalars) is not
 * supported here and would be rejected upstream by the provider's stricter
 * validation. Returns `null` when frontmatter is missing or has no `name:`.
 */
export function parseSkillNameFromFrontmatter(content: string): string | null {
  const normalized = content.replace(/^\uFEFF/, '');
  const frontmatter = normalized.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter) {
    return null;
  }

  const nameMatch = frontmatter[1].match(/^[ \t]*name[ \t]*:[ \t]*(.+?)[ \t]*$/m);

  if (!nameMatch) {
    return null;
  }

  const value = nameMatch[1].trim();

  return value.length > 0 ? value : null;
}
