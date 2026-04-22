import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const OFFICIAL_SKILLS_REPO = 'https://github.com/novuhq/skills.git';
const DEFAULT_OFFICIAL_SKILLS_BRANCH = 'main';
const OFFICIAL_SKILLS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const BUNDLED_GAP_FILLER_DIRS = ['dashboard-workflow', 'env-setup', 'framework-workflow'];

const IGNORED_ENTRIES_FROM_OFFICIAL = new Set([
  '.git',
  '.gitattributes',
  '.gitignore',
  'node_modules',
  'tests',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'LICENSE',
  'README.md',
]);

export type SkillHost = 'claude' | 'cursor';
export type SkillSource = 'official' | 'bundled';

export interface InstalledSkill {
  name: string;
  host: SkillHost;
  source: SkillSource;
  destination: string;
}

export interface InstallSkillsResult {
  installed: InstalledSkill[];
  officialFetched: boolean;
  officialError?: string;
  officialBranch: string;
}

export interface InstallSkillsOptions {
  hosts?: SkillHost[];
  officialBranch?: string;
}

interface SkillHostConfig {
  host: SkillHost;
  dir: string;
}

const SKILL_HOSTS: SkillHostConfig[] = [
  { host: 'claude', dir: '.claude/skills' },
  { host: 'cursor', dir: '.cursor/skills' },
];

export function installSkills(
  targetCwd: string,
  hostsOrOptions: SkillHost[] | InstallSkillsOptions = ['claude', 'cursor']
): InstallSkillsResult {
  const options: InstallSkillsOptions = Array.isArray(hostsOrOptions) ? { hosts: hostsOrOptions } : hostsOrOptions;
  const hosts = options.hosts ?? ['claude', 'cursor'];
  const officialBranch = options.officialBranch?.trim() || DEFAULT_OFFICIAL_SKILLS_BRANCH;

  const installed: InstalledSkill[] = [];
  const activeHosts = SKILL_HOSTS.filter((config) => hosts.includes(config.host));
  if (activeHosts.length === 0) {
    return { installed, officialFetched: false, officialBranch };
  }

  const officialFetch = fetchOfficialSkills(officialBranch);
  const bundledRoot = path.join(__dirname, 'content');

  for (const hostConfig of activeHosts) {
    const novuSkillRoot = path.join(targetCwd, hostConfig.dir, 'novu');
    fs.mkdirSync(novuSkillRoot, { recursive: true });

    if (officialFetch.ok) {
      for (const entry of fs.readdirSync(officialFetch.dir, { withFileTypes: true })) {
        if (IGNORED_ENTRIES_FROM_OFFICIAL.has(entry.name)) continue;
        const sourcePath = path.join(officialFetch.dir, entry.name);
        const destinationPath = path.join(novuSkillRoot, entry.name);
        if (entry.isDirectory()) {
          if (!containsSkillFile(sourcePath)) continue;
          copyDir(sourcePath, destinationPath);
          installed.push({
            name: entry.name,
            host: hostConfig.host,
            source: 'official',
            destination: path.relative(targetCwd, destinationPath),
          });
        } else if (entry.isFile() && entry.name === 'SKILL.md') {
          fs.copyFileSync(sourcePath, destinationPath);
          installed.push({
            name: 'novu',
            host: hostConfig.host,
            source: 'official',
            destination: path.relative(targetCwd, destinationPath),
          });
        }
      }
    }

    if (fs.existsSync(bundledRoot)) {
      for (const skill of BUNDLED_GAP_FILLER_DIRS) {
        const sourceDir = path.join(bundledRoot, skill);
        if (!fs.existsSync(sourceDir)) continue;
        const destinationDir = path.join(novuSkillRoot, skill);
        copyDir(sourceDir, destinationDir);
        installed.push({
          name: skill,
          host: hostConfig.host,
          source: 'bundled',
          destination: path.relative(targetCwd, destinationDir),
        });
      }
    }
  }

  return {
    installed,
    officialFetched: officialFetch.ok,
    officialError: officialFetch.ok ? undefined : officialFetch.error,
    officialBranch,
  };
}

export function detectSkillHosts(targetCwd: string): SkillHost[] {
  const hosts: SkillHost[] = [];
  if (fs.existsSync(path.join(targetCwd, '.claude'))) hosts.push('claude');
  if (fs.existsSync(path.join(targetCwd, '.cursor'))) hosts.push('cursor');

  return hosts;
}

interface OfficialFetchResult {
  ok: boolean;
  dir: string;
  error?: string;
}

function fetchOfficialSkills(branch: string): OfficialFetchResult {
  const cacheDir = path.join(os.homedir(), '.cache', 'novu-envoy', 'skills', sanitizeBranchSegment(branch));

  try {
    if (!hasGit()) {
      return { ok: false, dir: cacheDir, error: 'git is not available on PATH' };
    }

    if (isFreshCache(cacheDir)) {
      return { ok: true, dir: cacheDir };
    }

    if (fs.existsSync(path.join(cacheDir, '.git'))) {
      execFileSync('git', ['-C', cacheDir, 'pull', '--ff-only', '--depth=1', 'origin', branch], {
        stdio: 'ignore',
        timeout: 15_000,
      });
      touch(cacheDir);

      return { ok: true, dir: cacheDir };
    }

    fs.mkdirSync(path.dirname(cacheDir), { recursive: true });
    fs.rmSync(cacheDir, { recursive: true, force: true });
    execFileSync('git', ['clone', '--depth=1', '--branch', branch, OFFICIAL_SKILLS_REPO, cacheDir], {
      stdio: 'ignore',
      timeout: 30_000,
    });

    return { ok: true, dir: cacheDir };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { ok: false, dir: cacheDir, error: message };
  }
}

function sanitizeBranchSegment(branch: string): string {
  return branch.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'main';
}

function hasGit(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore', timeout: 5_000 });

    return true;
  } catch {
    return false;
  }
}

function isFreshCache(cacheDir: string): boolean {
  try {
    const gitDir = path.join(cacheDir, '.git');
    if (!fs.existsSync(gitDir)) return false;
    const stat = fs.statSync(gitDir);

    return Date.now() - stat.mtimeMs < OFFICIAL_SKILLS_CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function touch(dir: string): void {
  try {
    const now = new Date();
    fs.utimesSync(path.join(dir, '.git'), now, now);
  } catch {
    /* noop */
  }
}

function containsSkillFile(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, 'SKILL.md'));
  } catch {
    return false;
  }
}

function copyDir(source: string, destination: string): void {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}
