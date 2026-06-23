import fs from 'node:fs';
import path from 'node:path';

/**
 * Declarative descriptor for a package manager. The wizard's pre-install
 * step uses these to render a single install command per workspace and
 * detect the right manager from lockfiles.
 *
 * The shape is borrowed from the PostHog wizard's `package-manager.ts`:
 *  https://github.com/PostHog/wizard/blob/main/src/utils/package-manager.ts
 *
 * What's different here:
 *  - we distinguish yarn v1 from yarn v2/3/4 by lockfile content
 *    (yarn v1 emits `# yarn lockfile v1`; v2+ emits `__metadata` blocks),
 *  - we expose `workspaceFilter` as a callback so the install step can
 *    branch on yarn's `yarn workspace <name> add <pkgs>` shape (the filter
 *    sits *before* the verb, not after).
 */
export type PackageManagerName = 'pnpm' | 'yarn-v1' | 'yarn-v2' | 'bun' | 'npm';

export interface PackageManagerDescriptor {
  /** Stable id used in switch statements + analytics tags. */
  name: PackageManagerName;
  /** The "user-facing" pm family — what shows up in the report ("pnpm", "yarn", "npm", "bun"). */
  family: 'pnpm' | 'yarn' | 'npm' | 'bun';
  /** Display label for live-tail / report. */
  label: string;
  /**
   * The `<verb>` portion of the install command (e.g. `pnpm add`, `npm install`).
   * Always written without a trailing space so the install step can join with
   * the package list cleanly.
   */
  installCommand: string;
  /**
   * Static flags appended to every install command for this manager
   * (e.g. `--ignore-workspace-root-check` for pnpm + yarn v1). Empty string
   * when there are none.
   */
  flags: string;
  /** Force-install flag (`--force` for every supported manager today). */
  forceInstallFlag: string;
  /**
   * Build the workspace-filter argument string for an install in a given
   * workspace by name.
   *
   * - pnpm / bun: returns `--filter <name>` (sits after `add`).
   * - npm: returns `--workspace <name>` (sits after the package list).
   * - yarn v1 / v2+: returns the empty string here. The install step
   *   handles yarn separately because its workspace-install shape
   *   (`yarn workspace <name> add <pkgs>`) puts the filter *before* the
   *   verb, which the rest of the descriptors can't model with a single
   *   suffix string.
   */
  workspaceFilter: (workspaceName: string) => string;
  /** Lockfile-driven detection. */
  detect: (installDir: string) => boolean;
}

const PNPM: PackageManagerDescriptor = {
  name: 'pnpm',
  family: 'pnpm',
  label: 'pnpm',
  installCommand: 'pnpm add',
  flags: '--ignore-workspace-root-check',
  forceInstallFlag: '--force',
  workspaceFilter: (name) => `--filter ${name}`,
  detect: (installDir) => fs.existsSync(path.join(installDir, 'pnpm-lock.yaml')),
};

const YARN_V1: PackageManagerDescriptor = {
  name: 'yarn-v1',
  family: 'yarn',
  label: 'Yarn V1',
  installCommand: 'yarn add',
  flags: '--ignore-workspace-root-check',
  forceInstallFlag: '--force',
  workspaceFilter: () => '',
  detect: (installDir) => {
    try {
      const head = fs.readFileSync(path.join(installDir, 'yarn.lock'), 'utf-8').slice(0, 500);

      return head.includes('yarn lockfile v1');
    } catch {
      return false;
    }
  },
};

const YARN_V2: PackageManagerDescriptor = {
  name: 'yarn-v2',
  family: 'yarn',
  label: 'Yarn V2/3/4',
  installCommand: 'yarn add',
  flags: '',
  forceInstallFlag: '--force',
  workspaceFilter: () => '',
  detect: (installDir) => {
    try {
      const head = fs.readFileSync(path.join(installDir, 'yarn.lock'), 'utf-8').slice(0, 500);

      return head.includes('__metadata');
    } catch {
      return false;
    }
  },
};

const BUN: PackageManagerDescriptor = {
  name: 'bun',
  family: 'bun',
  label: 'Bun',
  installCommand: 'bun add',
  flags: '',
  forceInstallFlag: '--force',
  workspaceFilter: (name) => `--filter ${name}`,
  detect: (installDir) => ['bun.lockb', 'bun.lock'].some((lockFile) => fs.existsSync(path.join(installDir, lockFile))),
};

const NPM: PackageManagerDescriptor = {
  name: 'npm',
  family: 'npm',
  label: 'npm',
  installCommand: 'npm install',
  flags: '',
  forceInstallFlag: '--force',
  workspaceFilter: (name) => `--workspace ${name}`,
  detect: (installDir) => fs.existsSync(path.join(installDir, 'package-lock.json')),
};

/**
 * Priority order: pnpm → yarn (v1 > v2) → bun → npm. yarn v1 is checked
 * before v2 because its detect() only returns true for v1-shaped
 * lockfiles, and we want explicit matches to win over the generic npm
 * fallback at the end.
 */
export const PACKAGE_MANAGERS: ReadonlyArray<PackageManagerDescriptor> = [PNPM, YARN_V1, YARN_V2, BUN, NPM];

export const PACKAGE_MANAGER_BY_NAME: Record<PackageManagerName, PackageManagerDescriptor> = {
  pnpm: PNPM,
  'yarn-v1': YARN_V1,
  'yarn-v2': YARN_V2,
  bun: BUN,
  npm: NPM,
};

/**
 * Inspect `installDir` for lockfiles and pick the first matching
 * descriptor. Falls back to npm when nothing matches — same behaviour as
 * PostHog's wizard. Pure — no prompts.
 */
export function detectPackageManager(installDir: string): PackageManagerDescriptor {
  for (const pm of PACKAGE_MANAGERS) {
    if (pm.detect(installDir)) return pm;
  }

  return NPM;
}

export interface RenderInstallCommandInput {
  descriptor: PackageManagerDescriptor;
  packages: string[];
  workspaceName?: string | null;
  /** Append `--legacy-peer-deps` (only meaningful for npm + React 19). */
  legacyPeerDeps?: boolean;
  /** Append the descriptor's `forceInstallFlag`. */
  force?: boolean;
}

/**
 * Render a single install command string for a list of packages.
 *
 * Output shape (npm/pnpm/bun):
 *   `<installCommand> <pkg1> <pkg2> ... <flags?> <workspaceFilter?> <legacyPeerDeps?> <force?>`
 *
 * yarn is special-cased: when `workspaceName` is provided, the result is
 *   `yarn workspace <name> add <pkgs> <flags?>`
 * which puts the filter *before* the verb. v1 and v2 share this shape;
 * the only difference is whether `--ignore-workspace-root-check` is
 * appended (v1 yes, v2 no).
 */
export function renderInstallCommand(input: RenderInstallCommandInput): string {
  const { descriptor, packages, workspaceName, legacyPeerDeps, force } = input;
  if (packages.length === 0) {
    throw new Error('renderInstallCommand requires at least one package.');
  }

  if (descriptor.family === 'yarn' && workspaceName) {
    const parts = ['yarn', 'workspace', workspaceName, 'add', ...packages];
    if (descriptor.flags) parts.push(descriptor.flags);
    if (force) parts.push(descriptor.forceInstallFlag);

    return parts.join(' ');
  }

  const parts = [descriptor.installCommand, ...packages];

  if (descriptor.flags) parts.push(descriptor.flags);

  if (workspaceName) {
    const filter = descriptor.workspaceFilter(workspaceName);
    if (filter) parts.push(filter);
  }

  if (legacyPeerDeps && descriptor.name === 'npm') parts.push('--legacy-peer-deps');
  if (force) parts.push(descriptor.forceInstallFlag);

  return parts.join(' ');
}
