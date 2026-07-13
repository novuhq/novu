import fs from 'node:fs';
import path from 'node:path';
import fastGlob from 'fast-glob';
import { classifyWorkspace, type WorkspaceClassification } from './classify-workspace';
import { type PackageJsonShape, readPackageJson } from './detect-project';

/**
 * Package manager identifier surfaced to the rest of the wizard. Defined
 * here (instead of importing from `../types`) so `types.ts` can in turn
 * import `DetectedTopology` from this module without a cycle.
 */
export type ProjectPackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface InstallTarget {
  /** Absolute path to the workspace's `package.json` parent. */
  cwd: string;
  /** `name` from the workspace's `package.json` (used as `--filter <name>`). */
  workspaceName: string | null;
  classification: WorkspaceClassification;
  installedDeps: Set<string>;
  /** Subset of `installedDeps` that are Novu-published (`@novu/*` or `novu`). */
  installedNovuPackages: string[];
  /**
   * True when an existing Novu `@novu/framework` route is detected in this
   * workspace (e.g. `app/api/novu/route.ts` for Next.js App Router or
   * `pages/api/novu.ts` for Pages Router). The agent prompt uses this to
   * avoid re-creating the route in code-first runs.
   */
  hasFrameworkRoute: boolean;
  /** Workspace-relative path to the detected route, or `null`. */
  frameworkRoutePath: string | null;
  /** True when `typescript` is in the workspace's deps OR `<cwd>/tsconfig.json` exists. */
  hasTypeScript: boolean;
  /**
   * The full parsed `package.json` for the workspace. Kept on the target so
   * the install step can splice into `dependencies` without re-reading the
   * file when the spawned manager fails.
   */
  pkg: PackageJsonShape;
  /** Absolute path of the workspace's `package.json`. */
  packageJsonPath: string;
}

export interface DetectedTopology {
  rootCwd: string;
  packageManager: ProjectPackageManager;
  /**
   * Every workspace classified — including libraries — so the report
   * can explain which workspaces were intentionally skipped.
   */
  workspaces: {
    cwd: string;
    workspaceName: string | null;
    classification: WorkspaceClassification;
  }[];
  /** Application targets only (role !== 'library'). */
  targets: InstallTarget[];
  hasWeb: boolean;
  hasApi: boolean;
  hasFullstack: boolean;
}

/**
 * Walks the wizard's cwd, expanding monorepo workspace globs (pnpm /
 * npm / yarn shapes), classifies each one, and returns the
 * application targets the install step will operate on.
 *
 * Falls back to a single-target topology when the cwd is not a
 * monorepo or none of its workspaces classify as an application —
 * keeping behaviour for "ran the wizard from a single-package repo"
 * unchanged.
 */
export function detectInstallTargets(rootCwd: string, packageManager: ProjectPackageManager): DetectedTopology {
  const workspaceGlobs = readWorkspaceGlobs(rootCwd);

  if (workspaceGlobs.length === 0) {
    return buildTopology(rootCwd, packageManager, [singleTargetWorkspace(rootCwd)]);
  }

  const workspaceDirs = expandWorkspaceGlobs(rootCwd, workspaceGlobs);

  const workspaces: { cwd: string; pkg: PackageJsonShape | null }[] = [];
  for (const dir of workspaceDirs) {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = readPackageJson(pkgPath);
    if (!pkg) continue;
    workspaces.push({ cwd: dir, pkg });
  }

  if (workspaces.length === 0) {
    return buildTopology(rootCwd, packageManager, [singleTargetWorkspace(rootCwd)]);
  }

  return buildTopology(rootCwd, packageManager, workspaces);
}

function buildTopology(
  rootCwd: string,
  packageManager: ProjectPackageManager,
  workspaces: { cwd: string; pkg: PackageJsonShape | null }[]
): DetectedTopology {
  const allWorkspaces: DetectedTopology['workspaces'] = [];
  const targets: InstallTarget[] = [];

  for (const ws of workspaces) {
    if (!ws.pkg) continue;
    const classification = classifyWorkspace({ cwd: ws.cwd, pkg: ws.pkg });
    const workspaceName = typeof ws.pkg.name === 'string' && ws.pkg.name.length > 0 ? ws.pkg.name : null;

    allWorkspaces.push({ cwd: ws.cwd, workspaceName, classification });

    if (classification.role === 'library') continue;

    const installedDeps = new Set<string>([
      ...Object.keys(ws.pkg.dependencies ?? {}),
      ...Object.keys(ws.pkg.devDependencies ?? {}),
    ]);
    const installedNovuPackages = Array.from(installedDeps).filter((dep) => dep.startsWith('@novu/') || dep === 'novu');
    const route = detectFrameworkRoute(ws.cwd);

    targets.push({
      cwd: ws.cwd,
      workspaceName,
      classification,
      installedDeps,
      installedNovuPackages,
      hasFrameworkRoute: route.hasFrameworkRoute,
      frameworkRoutePath: route.frameworkRoutePath,
      hasTypeScript: detectTypeScript(ws.cwd, installedDeps),
      pkg: ws.pkg,
      packageJsonPath: path.join(ws.cwd, 'package.json'),
    });
  }

  return {
    rootCwd,
    packageManager,
    workspaces: allWorkspaces,
    targets,
    hasWeb: targets.some((t) => t.classification.role === 'web'),
    hasApi: targets.some((t) => t.classification.role === 'api'),
    hasFullstack: targets.some((t) => t.classification.role === 'fullstack'),
  };
}

function singleTargetWorkspace(rootCwd: string): { cwd: string; pkg: PackageJsonShape | null } {
  const pkgPath = path.join(rootCwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { cwd: rootCwd, pkg: null };
  }

  return { cwd: rootCwd, pkg: readPackageJson(pkgPath) };
}

function readWorkspaceGlobs(rootCwd: string): string[] {
  const pnpmWorkspaceFile = path.join(rootCwd, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmWorkspaceFile)) {
    return parsePnpmWorkspaceYaml(fs.readFileSync(pnpmWorkspaceFile, 'utf8'));
  }

  const rootPkgPath = path.join(rootCwd, 'package.json');
  if (!fs.existsSync(rootPkgPath)) return [];
  const rootPkg = readPackageJson(rootPkgPath);
  if (!rootPkg) return [];

  const workspaces = rootPkg.workspaces;
  if (Array.isArray(workspaces)) return workspaces.filter((w): w is string => typeof w === 'string');
  if (workspaces && typeof workspaces === 'object' && Array.isArray(workspaces.packages)) {
    return workspaces.packages.filter((w): w is string => typeof w === 'string');
  }

  return [];
}

/**
 * Tiny single-purpose parser for the `packages:` array in
 * `pnpm-workspace.yaml`. The wizard ships in a CLI, so adding `js-yaml`
 * just to read this one file is over-kill — the workspace shape is
 * always either a top-level `packages:` block (most common) or
 * `packages: [glob1, glob2]` (rare, but valid YAML flow style).
 *
 * We only support those two shapes. Anything more exotic (anchors,
 * multi-document files) is unlikely in practice; the wizard falls back
 * to single-target if parsing returns an empty array.
 */
function parsePnpmWorkspaceYaml(source: string): string[] {
  const lines = source.split(/\r?\n/);
  const globs: string[] = [];
  let inPackages = false;

  for (const rawLine of lines) {
    const stripped = rawLine.replace(/#.*$/, '');
    const trimmed = stripped.trimEnd();
    if (trimmed.length === 0) continue;

    if (!inPackages) {
      const inlineMatch = trimmed.match(/^packages\s*:\s*\[(.*)\]\s*$/);
      if (inlineMatch) {
        return parseInlineList(inlineMatch[1]);
      }
      if (/^packages\s*:\s*$/.test(trimmed)) {
        inPackages = true;
        continue;
      }
      continue;
    }

    const itemMatch = trimmed.match(/^\s*-\s+(.+?)\s*$/);
    if (itemMatch) {
      globs.push(stripQuotes(itemMatch[1]));
      continue;
    }

    if (!/^\s/.test(rawLine)) {
      inPackages = false;
    }
  }

  return globs;
}

function parseInlineList(body: string): string[] {
  return body
    .split(',')
    .map((entry) => stripQuotes(entry.trim()))
    .filter(Boolean);
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

const WORKSPACE_GLOB_IGNORES = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'];

function expandWorkspaceGlobs(rootCwd: string, globs: string[]): string[] {
  const positive: string[] = [];
  const negative: string[] = [];
  for (const entry of globs) {
    if (entry.startsWith('!')) negative.push(entry.slice(1));
    else positive.push(entry);
  }

  if (positive.length === 0) return [];

  const dirs = fastGlob.sync(
    positive.map((g) => normaliseGlob(g)),
    {
      cwd: rootCwd,
      onlyDirectories: true,
      absolute: true,
      ignore: [...WORKSPACE_GLOB_IGNORES, ...negative.map((g) => normaliseGlob(g))],
      suppressErrors: true,
    }
  );

  return Array.from(new Set(dirs));
}

function normaliseGlob(glob: string): string {
  return glob.endsWith('/*') || glob.endsWith('/**') ? glob : `${glob}`;
}

const FRAMEWORK_ROUTE_CANDIDATES = [
  'app/api/novu/route.ts',
  'app/api/novu/route.js',
  'src/app/api/novu/route.ts',
  'src/app/api/novu/route.js',
  'pages/api/novu.ts',
  'pages/api/novu.js',
];

function detectFrameworkRoute(cwd: string): { hasFrameworkRoute: boolean; frameworkRoutePath: string | null } {
  for (const candidate of FRAMEWORK_ROUTE_CANDIDATES) {
    if (fs.existsSync(path.join(cwd, candidate))) {
      return { hasFrameworkRoute: true, frameworkRoutePath: candidate };
    }
  }

  return { hasFrameworkRoute: false, frameworkRoutePath: null };
}

function detectTypeScript(cwd: string, installedDeps: Set<string>): boolean {
  if (installedDeps.has('typescript')) return true;

  return fs.existsSync(path.join(cwd, 'tsconfig.json'));
}
