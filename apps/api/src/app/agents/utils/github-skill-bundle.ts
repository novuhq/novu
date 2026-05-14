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

/** Hard cap on extracted skill bundle size to bound memory usage. */
const MAX_SKILL_BUNDLE_BYTES = 5 * 1024 * 1024;

/** A single bundle may not exceed this many entries. */
const MAX_SKILL_BUNDLE_ENTRIES = 500;

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
