import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OFFICIAL_SKILLS_REPO = 'https://github.com/novuhq/skills.git';
const DEFAULT_OFFICIAL_SKILLS_BRANCH = 'main';
const OFFICIAL_SKILLS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const BUNDLED_GAP_FILLER_DIRS = ['env-setup'];

const IGNORED_ENTRIES_FROM_OFFICIAL = new Set(['.git', 'node_modules']);

/**
 * Editors / agents that natively understand the agentskills.io `SKILL.md`
 * folder spec. Each value pairs to a config-dir marker on disk and a
 * write target inside that dir.
 *
 * `agents` is the cross-agent fallback (`.agents/skills/`). It is read by
 * Codex, Amp, Cursor, Windsurf, Copilot, Gemini CLI, Roo, OpenCode, and
 * others — we install there whenever the user has explicitly opted in by
 * creating `.agents/`, or as part of the safe-defaults fallback.
 *
 * Editors that use *rules* files instead of skills (Cline `.clinerules/`,
 * Continue `.continue/rules/`, Zed `AGENTS.md`) are intentionally excluded
 * — dropping a SKILL.md folder into them is a no-op.
 */
export type SkillHost =
  | 'claude'
  | 'cursor'
  | 'windsurf'
  | 'copilot'
  | 'gemini'
  | 'roo'
  | 'opencode'
  | 'kiro'
  | 'agents';

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
  /**
   * Filesystem markers — relative to the project root — that indicate the
   * editor is in use. If any one exists, the host counts as "detected".
   *
   * Markers are intentionally lenient: presence of the editor's config dir,
   * a known rules file, or a documented skills folder all qualify.
   */
  markers: string[];
}

/**
 * All editors that natively understand the agentskills.io `SKILL.md` folder
 * spec. Each entry's marker is its own config directory: presence of the
 * dir means the editor is in use and we should install into the matching
 * skills folder. We deliberately do NOT cross-pollinate markers (e.g.
 * AGENTS.md does not enable the `agents` host) so that an editor's own
 * skill list never ends up with two copies of the same Novu skill.
 */
const SKILL_HOSTS: SkillHostConfig[] = [
  { host: 'claude', dir: '.claude/skills', markers: ['.claude'] },
  { host: 'cursor', dir: '.cursor/skills', markers: ['.cursor'] },
  { host: 'windsurf', dir: '.windsurf/skills', markers: ['.windsurf'] },
  {
    host: 'copilot',
    dir: '.github/skills',
    markers: ['.github/copilot-instructions.md', '.github/instructions', '.github/skills'],
  },
  { host: 'gemini', dir: '.gemini/skills', markers: ['.gemini'] },
  { host: 'roo', dir: '.roo/skills', markers: ['.roo'] },
  { host: 'opencode', dir: '.opencode/skills', markers: ['.opencode'] },
  { host: 'kiro', dir: '.kiro/skills', markers: ['.kiro'] },
  { host: 'agents', dir: '.agents/skills', markers: ['.agents'] },
];

/**
 * Hosts to install for when *no* editor marker is detected. Per the
 * project convention this lays down the three most broadly useful targets:
 *
 * - `.claude/skills/` — Claude Code
 * - `.cursor/skills/` — Cursor
 * - `.agents/skills/` — cross-agent location read by Codex, Amp,
 *   Cursor, Windsurf, Copilot, Gemini CLI, Roo, OpenCode and others
 */
const SAFE_DEFAULT_HOSTS: SkillHost[] = ['claude', 'cursor', 'agents'];

export function installSkills(
  targetCwd: string,
  hostsOrOptions: SkillHost[] | InstallSkillsOptions = SAFE_DEFAULT_HOSTS
): InstallSkillsResult {
  const options: InstallSkillsOptions = Array.isArray(hostsOrOptions) ? { hosts: hostsOrOptions } : hostsOrOptions;
  const hosts = options.hosts ?? SAFE_DEFAULT_HOSTS;
  const officialBranch = options.officialBranch?.trim() || DEFAULT_OFFICIAL_SKILLS_BRANCH;

  const installed: InstalledSkill[] = [];
  const activeHosts = SKILL_HOSTS.filter((config) => hosts.includes(config.host));
  if (activeHosts.length === 0) {
    return { installed, officialFetched: false, officialBranch };
  }

  const officialFetch = fetchOfficialSkills(officialBranch);
  const bundledRoot = resolveBundledContentRoot();

  for (const hostConfig of activeHosts) {
    const skillsRoot = path.join(targetCwd, hostConfig.dir);
    fs.mkdirSync(skillsRoot, { recursive: true });

    cleanupLegacyNovuFolder(skillsRoot, targetCwd, hostConfig.host, installed);

    if (officialFetch.ok) {
      const officialSkillsDir = path.join(officialFetch.dir, 'skills');
      if (fs.existsSync(officialSkillsDir)) {
        for (const entry of fs.readdirSync(officialSkillsDir, { withFileTypes: true })) {
          if (IGNORED_ENTRIES_FROM_OFFICIAL.has(entry.name)) continue;
          if (!entry.isDirectory()) continue;
          const sourcePath = path.join(officialSkillsDir, entry.name);
          if (!containsSkillFile(sourcePath)) continue;
          const destinationPath = path.join(skillsRoot, entry.name);
          copyDir(sourcePath, destinationPath);
          installed.push({
            name: entry.name,
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
        const destinationDir = path.join(skillsRoot, skill);
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
  return SKILL_HOSTS.filter((config) =>
    config.markers.some((marker) => fs.existsSync(path.join(targetCwd, marker)))
  ).map((config) => config.host);
}

/**
 * Picks the hosts to install for: detected editors first, falling back to
 * `SAFE_DEFAULT_HOSTS` when nothing is detected. Centralized so the Ink UI
 * and the plain-text fallback renderer stay in lockstep.
 */
export function resolveSkillHosts(targetCwd: string): SkillHost[] {
  const detected = detectSkillHosts(targetCwd);

  return detected.length > 0 ? detected : [...SAFE_DEFAULT_HOSTS];
}

/**
 * Like {@link resolveSkillHosts}, but always guarantees `'claude'` is in the
 * returned host list — even in projects whose only marker is `.cursor/`,
 * `.windsurf/`, etc.
 *
 * Wizard's agent loop runs through the Claude Agent SDK with
 * `settingSources: ['project']`, which only scans `.claude/skills/` from
 * disk. If `installSkills` doesn't write there, the SDK comes up empty and
 * the `Skill` tool has nothing to invoke. Use this helper at any call site
 * whose output is consumed by the Wizard runtime; use plain `resolveSkillHosts`
 * for editor-mirroring use cases (e.g. `novu init`) where Claude Code is
 * incidental.
 */
export function resolveWizardRuntimeSkillHosts(targetCwd: string): SkillHost[] {
  return Array.from(new Set<SkillHost>([...resolveSkillHosts(targetCwd), 'claude']));
}

/**
 * Returns the on-disk skills directory (relative to the project root) for a
 * given host. Used by status renderers so we don't duplicate the host→path
 * mapping in multiple places.
 */
export function getSkillHostDir(host: SkillHost): string {
  const config = SKILL_HOSTS.find((entry) => entry.host === host);

  return config ? config.dir : '';
}

export { SAFE_DEFAULT_HOSTS };

interface OfficialFetchResult {
  ok: boolean;
  dir: string;
  error?: string;
}

function fetchOfficialSkills(branch: string): OfficialFetchResult {
  const cacheDir = path.join(os.homedir(), '.cache', 'novu-wizard', 'skills', sanitizeBranchSegment(branch));

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

/**
 * Returns true only when every entry under `dir` is a folder containing a
 * `SKILL.md`. Used as a safety guard before deleting the legacy
 * `<host>/skills/novu/` directory so we never blow away user-authored notes,
 * loose markdown files, or unrelated folders that happen to share the path.
 */
function containsOnlySkillFolders(dir: string): boolean {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.length === 0) return true;

    return entries.every((entry) => entry.isDirectory() && containsSkillFile(path.join(dir, entry.name)));
  } catch {
    return false;
  }
}

/**
 * Removes the legacy `<host>/skills/novu/` directory left behind by older
 * Wizard versions, but only when its contents look like our previous installs
 * (every entry is a folder with a `SKILL.md`). User-authored content under
 * the same path is preserved untouched.
 */
function cleanupLegacyNovuFolder(
  skillsRoot: string,
  targetCwd: string,
  host: SkillHost,
  installed: InstalledSkill[]
): void {
  const legacyNovuRoot = path.join(skillsRoot, 'novu');
  if (!fs.existsSync(legacyNovuRoot)) return;
  if (!containsOnlySkillFolders(legacyNovuRoot)) return;

  fs.rmSync(legacyNovuRoot, { recursive: true, force: true });
  installed.push({
    name: 'legacy-novu-cleanup',
    host,
    source: 'bundled',
    destination: path.relative(targetCwd, legacyNovuRoot),
  });
}

function resolveBundledContentRoot(): string {
  /**
   * `install-skills` is consumed in two compiled forms:
   *
   * - CommonJS at `dist/src/commands/wizard/skills/install-skills.js` — `__dirname`
   *   is that file's directory, so `<dir>/content` is the right answer.
   * - ESM bundle at `dist/src/commands/wizard/ui/index.mjs` — esbuild's banner
   *   sets `__dirname` to the bundle's directory (`.../wizard/ui`), so we need
   *   to walk up one level and then back down into `skills/content`.
   *
   * We try the candidates in order and return the first one that exists. The
   * `__dirname` fallback keeps behaviour stable in unfamiliar environments.
   */
  const dir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidates = [
    path.join(dir, 'content'),
    path.join(dir, '..', 'skills', 'content'),
    path.join(dir, '..', '..', 'skills', 'content'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0];
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
