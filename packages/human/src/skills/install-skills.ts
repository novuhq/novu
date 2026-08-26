import fs from 'node:fs';
import path from 'node:path';

/**
 * Editors/agents that natively read the agentskills.io `SKILL.md` folder
 * spec. Mirrors the host list `novu init`/wizard use, minus the parts that
 * only make sense for a full skills catalog (git-fetched "official" skills) —
 * `@novu/human` ships exactly one first-party skill, bundled in this package.
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

interface SkillHostConfig {
  host: SkillHost;
  dir: string;
  /** Any marker present means the editor is in use. */
  markers: string[];
}

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

/** No editor marker detected → lay down the three most broadly useful targets. */
const SAFE_DEFAULT_HOSTS: SkillHost[] = ['claude', 'cursor', 'agents'];

const SKILL_NAME = 'human-cli';

export interface InstalledSkill {
  host: SkillHost;
  destination: string;
}

export function detectSkillHosts(targetCwd: string): SkillHost[] {
  return SKILL_HOSTS.filter((config) =>
    config.markers.some((marker) => fs.existsSync(path.join(targetCwd, marker)))
  ).map((config) => config.host);
}

/**
 * Detected editors first, falling back to the safe defaults — and always
 * including `claude`, since that's this session's own runtime and the most
 * common place an agent using this CLI is running from.
 */
export function resolveSkillHosts(targetCwd: string): SkillHost[] {
  const detected = detectSkillHosts(targetCwd);
  const hosts = detected.length > 0 ? detected : [...SAFE_DEFAULT_HOSTS];

  return Array.from(new Set<SkillHost>([...hosts, 'claude']));
}

export function installHumanSkill(
  targetCwd: string,
  hosts: SkillHost[] = resolveSkillHosts(targetCwd)
): InstalledSkill[] {
  const sourceDir = resolveBundledSkillDir();
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Bundled skill content is missing (expected at ${sourceDir}). Reinstall @novu/human.`);
  }

  const activeHosts = SKILL_HOSTS.filter((config) => hosts.includes(config.host));
  const installed: InstalledSkill[] = [];

  for (const hostConfig of activeHosts) {
    const destinationDir = path.join(targetCwd, hostConfig.dir, SKILL_NAME);
    copyDir(sourceDir, destinationDir);
    installed.push({ host: hostConfig.host, destination: path.relative(targetCwd, destinationDir) });
  }

  return installed;
}

function resolveBundledSkillDir(): string {
  const dir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

  return path.join(dir, 'content', SKILL_NAME);
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
