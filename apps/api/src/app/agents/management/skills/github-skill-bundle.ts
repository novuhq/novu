import { posix } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
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

/**
 * Hard wall-clock budget for the GitHub tarball fetch + parse pipeline.
 * When exceeded, the AbortController tears down the network socket and the
 * caller sees a user-facing "timed out" error instead of an indefinite hang.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Per-file size cap, checked against `entry.size` BEFORE any bytes are consumed.
 * Skill files are markdown + small scripts; anything larger is almost certainly
 * a checked-in binary / vendored asset that shouldn't blow the per-bundle cap.
 */
const PER_FILE_BYTES_CAP = 1 * 1024 * 1024;

/**
 * Directories that never contain skill content. Any tar entry with one of these
 * names as a path segment is skipped at the header without buffering its bytes —
 * defensive against repos that accidentally check in vendored / build output.
 */
const SKIP_DIR_SEGMENTS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
]);

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

// ─── GitHub HTTP plumbing ───────────────────────────────────────────────────

/**
 * Headers for GitHub's REST API. Reads `GITHUB_API_TOKEN` per-request, so an
 * env-var rotation takes effect on the next call. Authenticated requests get
 * a higher rate-limit tier; missing token falls back to the anonymous limit.
 *
 * Scope the token to public-repo read only. {@link assertPublicRepository}
 * enforces this at the application layer, but operator scoping is the first
 * line of defense.
 */
function buildGithubHeaders(): HeadersInit {
  const token = process.env.GITHUB_API_TOKEN?.trim();

  return {
    'User-Agent': 'novu-agents-skill-uploader',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type GithubRepositoryMetadata = {
  private?: boolean;
  visibility?: string;
};

/**
 * Refuses to download a tarball unless `GET /repos/{owner}/{repo}` confirms
 * the target is unambiguously public — `private === false` and any explicit
 * `visibility` is `"public"`. Without this, a caller with `AGENT_WRITE` could
 * exfiltrate any private repo the `GITHUB_API_TOKEN` can read.
 *
 * 404, non-public metadata, and malformed bodies all surface the same error
 * so private repos can't be enumerated via error-string differences.
 */
async function assertPublicRepository(parsed: ParsedGithubUrl, signal: AbortSignal): Promise<void> {
  const url = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: buildGithubHeaders(),
      redirect: 'follow',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('GitHub repository lookup timed out.');
    }
    throw err;
  }

  if (response.status === 404) {
    throw new Error(`GitHub repository ${parsed.owner}/${parsed.repo} is not publicly accessible or does not exist.`);
  }

  if (!response.ok) {
    throw mapGithubHttpError(response, parsed);
  }

  let metadata: GithubRepositoryMetadata;
  try {
    metadata = (await response.json()) as GithubRepositoryMetadata;
  } catch {
    throw new Error('GitHub repository metadata response was malformed.');
  }

  const isPublic =
    metadata.private === false && (metadata.visibility === undefined || metadata.visibility === 'public');

  if (!isPublic) {
    throw new Error(`GitHub repository ${parsed.owner}/${parsed.repo} is not publicly accessible or does not exist.`);
  }
}

let warnedAboutMissingToken = false;

function maybeWarnMissingToken(): void {
  if (warnedAboutMissingToken) return;
  if (process.env.GITHUB_API_TOKEN?.trim()) return;
  warnedAboutMissingToken = true;
  // eslint-disable-next-line no-console -- bundle util is plain TS, no logger injected
  console.warn(
    '[github-skill-bundle] GITHUB_API_TOKEN is not set — GitHub tarball downloads will use the 60 req/hr anonymous tier. Set GITHUB_API_TOKEN to a fine-grained PAT (public repository read) in production.'
  );
}

/**
 * RFC 9110-compatible `Retry-After` parser. Returns the wait in milliseconds.
 * Mirrors the helper in `anthropic-agent-runtime.provider.ts`; kept local here
 * to avoid a cross-package dep until a third call site appears.
 */
function parseRetryAfter(header: string | undefined | null): number {
  if (!header) return 60_000;
  const seconds = parseFloat(header);
  if (!Number.isNaN(seconds)) return Math.round(seconds * 1000);

  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());

  return 60_000;
}

/**
 * Maps a non-2xx GitHub tarball response to a user-facing `Error`. Differentiates
 * 404 (bad repo/ref), primary rate-limit exhaustion (`403 + x-ratelimit-remaining: 0`),
 * secondary rate-limit (`429`), and generic non-2xx.
 */
function mapGithubHttpError(res: Response, parsed: ParsedGithubUrl): Error {
  if (res.status === 404) {
    return new Error(`GitHub repository or ref not found (${parsed.owner}/${parsed.repo}@${parsed.ref}).`);
  }

  const remaining = res.headers.get('x-ratelimit-remaining');
  if (res.status === 429 || (res.status === 403 && remaining === '0')) {
    const retryAfterSec = Math.ceil(parseRetryAfter(res.headers.get('retry-after')) / 1000);

    return new Error(`GitHub rate limit exceeded — retry in ~${retryAfterSec}s.`);
  }

  return new Error(`Failed to download GitHub tarball (HTTP ${res.status}).`);
}

// ─── Streaming tar pipeline ────────────────────────────────────────────────

type TarEntry = NodeJS.ReadableStream & { path: string; type?: string; size?: number };

export type EntryContext = {
  /** The raw tar entry stream. Attach `data`/`end`/`error` listeners to buffer its bytes. */
  entry: TarEntry;
  /** Path inside the archive's top-level directory (top-level prefix already stripped). */
  repoPath: string;
  /** Path as it appears in the archive, before stripping the top-level dir. */
  entryPath: string;
  /**
   * Abort the entire stream and propagate `err` to the caller of
   * {@link streamTarballToParser}. Use from inside `data`/`end` handlers when
   * a per-bundle aggregate budget (e.g. byte total, entry count) is exceeded.
   */
  fail: (err: Error) => void;
};

/**
 * Streams a GitHub repository tarball through `tar`'s `Parser`, invoking
 * `onEntry` for every regular file entry that passes safety checks
 * (single-top-level-dir invariant, no `..` traversal, not in `SKIP_DIR_SEGMENTS`,
 * not larger than `PER_FILE_BYTES_CAP`).
 *
 * The `onEntry` callback owns deciding whether to buffer the entry's bytes
 * (attach `data`/`end` listeners) or discard it (call `entry.resume()`).
 *
 * Network + parse are overlapped via `pipeline()` so peak memory stays bounded
 * to one in-flight entry's bytes regardless of archive size. A 30 s
 * `AbortSignal` enforces a wall-clock budget; any logical failure inside
 * `onEntry` should call `ctx.fail(err)` to abort the stream and surface `err`
 * as the rejection reason.
 */
async function streamTarballToParser(parsed: ParsedGithubUrl, onEntry: (ctx: EntryContext) => void): Promise<void> {
  let aborted: Error | null = null;
  let topLevelDir: string | null = null;

  const controller = new AbortController();
  const fail = (err: Error) => {
    if (!aborted) aborted = err;
    if (!controller.signal.aborted) controller.abort(err);
  };

  const timeoutHandle = setTimeout(() => {
    fail(new Error('GitHub tarball download timed out.'));
  }, REQUEST_TIMEOUT_MS);

  try {
    maybeWarnMissingToken();

    // Refuse non-public repos before fetching any tarball bytes.
    await assertPublicRepository(parsed, controller.signal);

    const response = await fetch(buildGithubTarballUrl(parsed), {
      signal: controller.signal,
      headers: buildGithubHeaders(),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw mapGithubHttpError(response, parsed);
    }
    if (!response.body) {
      throw new Error('GitHub tarball response had no body.');
    }

    const parser = new Parser();

    parser.on('entry', (entry: TarEntry) => {
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

      if (firstSlash === -1) {
        entry.resume();

        return;
      }

      const repoPath = entryPath.slice(firstSlash + 1);
      if (repoPath.length === 0) {
        entry.resume();

        return;
      }

      const segments = repoPath.split('/');
      if (segments.some((seg) => SKIP_DIR_SEGMENTS.has(seg))) {
        entry.resume();

        return;
      }

      if (typeof entry.size === 'number' && entry.size > PER_FILE_BYTES_CAP) {
        entry.resume();

        return;
      }

      try {
        onEntry({ entry, repoPath, entryPath, fail });
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
        entry.resume();
      }
    });

    parser.on('error', (err: Error) => fail(err));

    try {
      await pipeline(Readable.fromWeb(response.body as never), parser);
    } catch (err) {
      if (aborted) throw aborted;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('GitHub tarball download timed out.');
      }
      throw err;
    }

    if (aborted) throw aborted;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

// ─── Public entry points ───────────────────────────────────────────────────

/**
 * Downloads a GitHub repository tarball and extracts the regular files at — and
 * below — `parsed.subPath` relative to the archive's top-level directory.
 *
 * Streams the archive: peak memory is one in-flight entry's bytes regardless of
 * repo size. Validates that `SKILL.md` exists at the resolved root.
 *
 * Throws `Error` with a user-facing message on non-2xx HTTP, timeout, rate
 * limit, validation, or extraction failures — callers should wrap in a
 * `BadRequestException`.
 */
export async function fetchAndExtractSkillBundle(parsed: ParsedGithubUrl): Promise<UploadSkillFile[]> {
  const targetSubPath = parsed.subPath.replace(/^\/+|\/+$/g, '');
  const collected: UploadSkillFile[] = [];
  let totalBytes = 0;
  let bundleFailed = false;

  await streamTarballToParser(parsed, ({ entry, repoPath, fail }) => {
    let relativePath: string;
    if (targetSubPath.length > 0) {
      if (repoPath === targetSubPath) {
        relativePath = '';
      } else if (repoPath.startsWith(`${targetSubPath}/`)) {
        relativePath = repoPath.slice(targetSubPath.length + 1);
      } else {
        entry.resume();

        return;
      }
    } else {
      relativePath = repoPath;
    }

    if (relativePath.length === 0) {
      entry.resume();

      return;
    }

    if (collected.length >= MAX_SKILL_BUNDLE_ENTRIES) {
      bundleFailed = true;
      fail(new Error(`Skill bundle exceeds the maximum of ${MAX_SKILL_BUNDLE_ENTRIES} files.`));
      entry.resume();

      return;
    }

    const chunks: Buffer[] = [];

    entry.on('data', (chunk: Buffer) => {
      if (bundleFailed) return;
      totalBytes += chunk.length;

      if (totalBytes > MAX_SKILL_BUNDLE_BYTES) {
        bundleFailed = true;
        fail(new Error(`Skill bundle exceeds the maximum size of ${MAX_SKILL_BUNDLE_BYTES} bytes.`));

        return;
      }

      chunks.push(chunk);
    });

    entry.on('end', () => {
      if (bundleFailed) return;
      collected.push({ path: relativePath, content: Buffer.concat(chunks) });
    });

    entry.on('error', (err: Error) => {
      if (!bundleFailed) {
        bundleFailed = true;
        fail(err);
      }
    });
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
 * Discovers the skill bundles named by `basenames` in a GitHub repository
 * tarball.
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
 * Streaming filter: only tar entries whose `repoPath` has at least one segment
 * matching the supplied `basenames` set are buffered. This bounds memory to
 * "files plausibly belonging to a requested skill" rather than "every file in
 * the repo." Returned bundles are filtered to those whose directory basename
 * matches one of the supplied names:
 *   - 0 matches for a name           → throws (listing available skills)
 *   - multiple matches for a name    → throws (listing conflicting paths)
 *   - duplicates in `basenames`      → silently deduplicated
 *   - result order                   → matches the order of `basenames`
 *
 * `basenames` must be non-empty (enforced upstream by the DTO).
 *
 * Throws `Error` with user-facing messages on validation failures — callers
 * should wrap in `BadRequestException`.
 */
export async function fetchAndDiscoverSkillBundles(
  parsed: ParsedGithubUrl,
  basenames: string[]
): Promise<DiscoveredSkillBundle[]> {
  if (!Array.isArray(basenames) || basenames.length === 0) {
    throw new Error('At least one skill basename is required.');
  }

  const wanted = new Set<string>();
  for (const raw of basenames) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name.length === 0) {
      throw new Error('Skill basenames may not be empty strings.');
    }
    wanted.add(name);
  }

  const candidates: RawTarEntry[] = [];
  let totalBytes = 0;
  let bundleFailed = false;

  await streamTarballToParser(parsed, ({ entry, repoPath, fail }) => {
    const segments = repoPath.split('/');
    // Keep the entry if either:
    //   1. A path segment matches one of the user-requested basenames (the actual content), OR
    //   2. The entry is a `SKILL.md` anywhere in the repo — buffered cheaply so
    //      `filterByBasenames` below can produce a "not found / ambiguous"
    //      error that lists the repo's available skill basenames.
    const isSkillMd = posix.basename(repoPath) === 'SKILL.md';
    const matchesBasename = segments.some((seg) => wanted.has(seg));

    if (!isSkillMd && !matchesBasename) {
      entry.resume();

      return;
    }

    if (candidates.length >= MAX_SKILL_BUNDLE_ENTRIES) {
      bundleFailed = true;
      fail(new Error(`Skill bundle exceeds the maximum of ${MAX_SKILL_BUNDLE_ENTRIES} files.`));
      entry.resume();

      return;
    }

    const chunks: Buffer[] = [];

    entry.on('data', (chunk: Buffer) => {
      if (bundleFailed) return;
      totalBytes += chunk.length;

      if (totalBytes > MAX_SKILL_BUNDLE_BYTES) {
        bundleFailed = true;
        fail(new Error(`Skill bundle exceeds the maximum size of ${MAX_SKILL_BUNDLE_BYTES} bytes.`));

        return;
      }

      chunks.push(chunk);
    });

    entry.on('end', () => {
      if (bundleFailed) return;
      candidates.push({ repoPath, content: Buffer.concat(chunks) });
    });

    entry.on('error', (err: Error) => {
      if (!bundleFailed) {
        bundleFailed = true;
        fail(err);
      }
    });
  });

  if (candidates.length === 0) {
    throw new Error('No skill bundles found — the repository contains no matching `SKILL.md` files.');
  }

  const bundleRoots = new Set<string>();

  for (const entry of candidates) {
    if (posix.basename(entry.repoPath) === 'SKILL.md') {
      const parent = posix.dirname(entry.repoPath);
      bundleRoots.add(parent === '.' ? '' : parent);
    }
  }

  if (bundleRoots.size === 0) {
    throw new Error(
      'No skill bundles found — the repository contains no `SKILL.md` files matching the requested skills.'
    );
  }

  const sortedRoots = Array.from(bundleRoots).sort();
  const bundles = new Map<string, UploadSkillFile[]>();

  for (const root of sortedRoots) {
    bundles.set(root, []);
  }

  for (const entry of candidates) {
    const owningRoot = findDeepestBundleRoot(entry.repoPath, sortedRoots);
    if (owningRoot === null) continue;

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
    .filter((b) => b.files.length > 0 && b.files.some((f) => f.path === 'SKILL.md'));

  if (discovered.length === 0) {
    throw new Error('No skill bundles found — the repository contains no matching `SKILL.md` files.');
  }

  return filterByBasenames(discovered, basenames);
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
  // Use `[ \t]*` (not `\s*`) so the pre-newline whitespace class does not overlap
  // with `\r?\n`. Overlapping whitespace classes can trigger polynomial
  // backtracking on adversarial input (flagged by CodeQL js/polynomial-redos).
  const frontmatter = normalized.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter) {
    return null;
  }

  // Walks frontmatter line-by-line and extracts the `name:` value via plain
  // string ops. The previous single-regex (`/^[ \t]*name[ \t]*:[ \t]*(.*)$/m`)
  // placed two `[ \t]*` quantifiers around a lazy/greedy capture; even though
  // `name` is a fixed anchor between them, CodeQL flagged the shape as
  // `js/polynomial-redos`. Per-line string ops sidestep the static analyser
  // without changing observable semantics — each surviving regex is anchored
  // at exactly one end with no overlapping quantifier so it runs in linear time.
  for (const rawLine of frontmatter[1].split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const trimmedStart = line.replace(/^[ \t]+/, '');

    if (!trimmedStart.startsWith('name')) {
      continue;
    }

    const afterName = trimmedStart.slice(4).replace(/^[ \t]+/, '');

    if (!afterName.startsWith(':')) {
      continue;
    }

    const value = afterName
      .slice(1)
      .replace(/^[ \t]+/, '')
      .replace(/[ \t]+$/, '');

    return value.length > 0 ? value : null;
  }

  return null;
}
