import fs from 'node:fs';
import path from 'node:path';
import spawn from 'cross-spawn';
import { type WorkspaceClassification, type WorkspaceRole } from '../../context/classify-workspace';
import type { DetectedTopology, InstallTarget } from '../../context/detect-install-targets';
import { rebalanceGoal } from '../../context/rebalance-goal';
import type { ProjectContext, ProjectFramework } from '../../types';
import type { WizardGoal } from '../../ui/wizard-session';
import type { WizardUI } from '../../ui/wizard-ui';
import {
  detectPackageManager,
  type PackageManagerDescriptor,
  renderInstallCommand,
} from '../../utils/package-managers';

const NOVU_JS = '@novu/js';
const NOVU_REACT = '@novu/react';
const NOVU_NEXTJS = '@novu/nextjs';
const NOVU_REACT_NATIVE = '@novu/react-native';
const NOVU_API = '@novu/api';
const NOVU_FRAMEWORK = '@novu/framework';
const REACT_EMAIL_COMPONENTS = '@react-email/components';

export interface InstallPackagesTargetResult {
  cwd: string;
  workspaceName: string | null;
  role: WorkspaceRole;
  framework: ProjectFramework;
  /** What we wanted to install (after subtracting already-present packages). */
  packagesRequested: string[];
  /** What the spawned package manager actually wrote to `node_modules`. */
  packagesInstalled: string[];
  /** What we had to splice into `package.json` because the manager errored. */
  packagesEditedDirectly: string[];
  /** Path to the JSON dump written when the manager errored. */
  errorLogPath?: string;
  /** Resolved command we attempted to run (kept for reporting). */
  command?: string;
}

export interface InstallPackagesResult {
  /** The goal the user requested via `--goal=<x>` (or the default). */
  requestedGoal: WizardGoal;
  /** What the topology actually allows; threaded into the agent run. */
  effectiveGoal: WizardGoal;
  /** Empty when the goal stayed the same; otherwise the rebalance reason. */
  rebalanceReason: string;
  topology: DetectedTopology;
  packageManager: PackageManagerDescriptor;
  targets: InstallPackagesTargetResult[];
  /** Workspaces classified as `library` and intentionally skipped. */
  skippedWorkspaces: { cwd: string; workspaceName: string | null; reason: string }[];
}

export interface RunInstallPackagesStepInput {
  ui: WizardUI;
  project: ProjectContext;
  goal: WizardGoal;
}

/**
 * Pre-install Novu packages OUTSIDE the Claude Agent SDK sandbox.
 *
 * This step runs from the wizard CLI's parent Node process, which has
 * full filesystem access (the agent's sandbox blocks pnpm's
 * `clonefile()` syscall on macOS, causing every install attempt inside
 * the SDK to fail).
 *
 * Flow:
 *  1. Walk the cwd, classify each workspace into web / api / fullstack /
 *     library, drop libraries.
 *  2. Rebalance the wizard goal against the detected topology — for
 *     example a monorepo with only a single web app downgrades a
 *     `full` request to `inbox`. Aborts the wizard when the requested
 *     goal is structurally impossible (`inbox` × api-only).
 *  3. For each application target, render and spawn ONE install command
 *     containing every package the target needs (per the per-role
 *     matrix in the plan). Targets are awaited sequentially so two
 *     simultaneous package-manager processes never write the same
 *     lockfile.
 *  4. On non-zero exit: write a per-failure log file, splice the
 *     packages into the workspace's `package.json` directly so the
 *     agent run can still emit imports, and continue to the next
 *     target.
 */
export async function runInstallPackagesStep(input: RunInstallPackagesStepInput): Promise<InstallPackagesResult> {
  const { ui, project, goal } = input;

  const topology = project.topology;
  const packageManager = detectPackageManager(topology.rootCwd);

  const rebalance = rebalanceGoal({ requestedGoal: goal, topology });
  if (rebalance.kind === 'block') {
    throw new Error(rebalance.reason);
  }

  if (rebalance.effectiveGoal !== rebalance.requestedGoal) {
    ui.pushStatus(rebalance.reason, 'warn');
    ui.setGoal(rebalance.effectiveGoal);
  }

  for (const ws of topology.workspaces) {
    const label = ws.workspaceName ?? (path.relative(topology.rootCwd, ws.cwd) || 'root');
    const framework = ws.classification.framework;
    const frameworkSuffix = framework !== 'unknown' ? `, ${framework}` : '';
    ui.pushLiveTail(`[install] ${label} (${ws.classification.role}${frameworkSuffix}) — ${ws.classification.reason}`);
  }

  const skippedWorkspaces = topology.workspaces
    .filter((ws) => ws.classification.role === 'library')
    .map((ws) => ({
      cwd: ws.cwd,
      workspaceName: ws.workspaceName,
      reason: ws.classification.reason,
    }));

  const targets: InstallPackagesTargetResult[] = [];

  for (const target of topology.targets) {
    const labelName = target.workspaceName ?? (path.relative(topology.rootCwd, target.cwd) || target.cwd);
    const packages = pickPackagesForTarget(rebalance.effectiveGoal, target);

    if (packages.length === 0) {
      ui.pushStatus(`Skipping ${labelName} — required Novu packages already installed.`);
      targets.push({
        cwd: target.cwd,
        workspaceName: target.workspaceName,
        role: target.classification.role,
        framework: target.classification.framework,
        packagesRequested: [],
        packagesInstalled: [],
        packagesEditedDirectly: [],
      });
      continue;
    }

    const result = await installPackagesIntoTarget({
      ui,
      target,
      packages,
      packageManager,
      isMonorepo: topology.targets.length > 1 || topology.rootCwd !== target.cwd,
      rootCwd: topology.rootCwd,
    });
    targets.push(result);
  }

  return {
    requestedGoal: rebalance.requestedGoal,
    effectiveGoal: rebalance.effectiveGoal,
    rebalanceReason: rebalance.reason,
    topology,
    packageManager,
    targets,
    skippedWorkspaces,
  };
}

/**
 * Compute the full package set for a single target based on the
 * effective goal and the target's role + already-installed deps.
 *
 * Intentionally pure — exposed so the install spec can verify the
 * matrix without spinning up the full step.
 */
export function pickPackagesForTarget(goal: WizardGoal, target: InstallTarget): string[] {
  const { classification, installedDeps } = target;
  const wantsInbox = goal === 'inbox' || goal === 'full';
  const wantsWorkflows = goal === 'workflows' || goal === 'full';
  const out: string[] = [];

  if (wantsInbox && (classification.role === 'web' || classification.role === 'fullstack')) {
    const inboxSdk = pickInboxSdk(classification);
    if (!installedDeps.has(inboxSdk)) out.push(inboxSdk);
  }

  if (wantsWorkflows && (classification.role === 'api' || classification.role === 'fullstack')) {
    if (!installedDeps.has(NOVU_API)) out.push(NOVU_API);
    if (installedDeps.has(NOVU_FRAMEWORK) && !installedDeps.has(REACT_EMAIL_COMPONENTS)) {
      out.push(REACT_EMAIL_COMPONENTS);
    }
  }

  return out;
}

/**
 * Picks the Inbox SDK for a `web` / `fullstack` workspace.
 *
 * Priority order:
 *  1. React Native / Expo → `@novu/react-native` (Inbox ships as a
 *     separate package on RN — `@novu/react` won't run there).
 *  2. Next.js (any router) → `@novu/nextjs` (subpath exports cover both
 *     App and Pages routers and pull `@novu/react` transitively).
 *  3. Other React-based frameworks (Remix, RedwoodJS, Blitz,
 *     Astro+React, React+Vite, plain React) → `@novu/react`.
 *  4. Non-React frameworks (Vue, Svelte, SvelteKit, Nuxt, Solid,
 *     Angular, Qwik, static Astro, anything else) → `@novu/js`,
 *     Novu's headless / framework-agnostic Inbox SDK.
 */
export function pickInboxSdk(classification: WorkspaceClassification): string {
  if (classification.isReactNative) return NOVU_REACT_NATIVE;
  if (classification.framework === 'nextjs-app' || classification.framework === 'nextjs-pages') {
    return NOVU_NEXTJS;
  }
  if (classification.isReactBased) return NOVU_REACT;

  return NOVU_JS;
}

interface InstallIntoTargetInput {
  ui: WizardUI;
  target: InstallTarget;
  packages: string[];
  packageManager: PackageManagerDescriptor;
  isMonorepo: boolean;
  rootCwd: string;
}

async function installPackagesIntoTarget(input: InstallIntoTargetInput): Promise<InstallPackagesTargetResult> {
  const { ui, target, packages, packageManager, isMonorepo, rootCwd } = input;
  const labelName = target.workspaceName ?? (path.relative(rootCwd, target.cwd) || target.cwd);

  const useWorkspaceFilter = isMonorepo && target.workspaceName !== null;
  const command = renderInstallCommand({
    descriptor: packageManager,
    packages,
    workspaceName: useWorkspaceFilter ? target.workspaceName : null,
    legacyPeerDeps: shouldUseLegacyPeerDeps(packageManager, target),
  });

  ui.pushStatus(`Installing ${packages.join(', ')} in ${labelName}…`);
  ui.pushLiveTail(`[install] ${labelName}: ${command}`);

  const cwd = useWorkspaceFilter ? rootCwd : target.cwd;
  const spawnResult = await spawnInstall({ command, cwd, ui, label: labelName });

  if (spawnResult.exitCode === 0) {
    ui.pushStatus(`Installed ${packages.join(', ')} in ${labelName}.`, 'ok');

    return {
      cwd: target.cwd,
      workspaceName: target.workspaceName,
      role: target.classification.role,
      framework: target.classification.framework,
      packagesRequested: packages,
      packagesInstalled: packages,
      packagesEditedDirectly: [],
      command,
    };
  }

  const errorLogPath = writeInstallErrorLog({
    cwd: target.cwd,
    workspaceName: target.workspaceName,
    command,
    spawnResult,
  });

  ui.pushStatus(
    `Install failed in ${labelName} (exit ${spawnResult.exitCode}). Splicing packages into package.json — run \`${packageManager.family} install\` afterwards.`,
    'warn'
  );

  const editedPackages = applyPackageJsonFallback(target, packages);

  return {
    cwd: target.cwd,
    workspaceName: target.workspaceName,
    role: target.classification.role,
    framework: target.classification.framework,
    packagesRequested: packages,
    packagesInstalled: [],
    packagesEditedDirectly: editedPackages,
    errorLogPath,
    command,
  };
}

interface SpawnInstallInput {
  command: string;
  cwd: string;
  ui: WizardUI;
  label: string;
}

interface SpawnInstallResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function spawnInstall(input: SpawnInstallInput): Promise<SpawnInstallResult> {
  const [bin, ...args] = input.command.split(/\s+/).filter(Boolean);

  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd: input.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ADBLOCK: '1',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      streamToLiveTail(input.ui, input.label, text);
    });
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      streamToLiveTail(input.ui, input.label, text);
    });

    child.on('error', (err) => {
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + (stderr.endsWith('\n') ? '' : '\n') + (err instanceof Error ? err.message : String(err)),
      });
    });

    child.on('close', (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
  });
}

function streamToLiveTail(ui: WizardUI, label: string, text: string): void {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    ui.pushLiveTail(`[install] ${label}: ${line}`);
  }
}

function shouldUseLegacyPeerDeps(packageManager: PackageManagerDescriptor, target: InstallTarget): boolean {
  if (packageManager.name !== 'npm') return false;
  const reactVersion = target.pkg.dependencies?.react ?? target.pkg.devDependencies?.react;

  return isReact19OrLater(reactVersion);
}

function isReact19OrLater(version: string | undefined): boolean {
  if (!version) return false;
  const cleaned = version.replace(/^[~^>=<\s]+/, '');
  const major = Number.parseInt(cleaned.split('.')[0] ?? '', 10);
  if (Number.isNaN(major)) return false;

  return major >= 19;
}

interface WriteInstallErrorLogInput {
  cwd: string;
  workspaceName: string | null;
  command: string;
  spawnResult: SpawnInstallResult;
}

function writeInstallErrorLog(input: WriteInstallErrorLogInput): string {
  const slug = input.workspaceName?.replace(/[^a-z0-9_-]/gi, '-') ?? path.basename(input.cwd);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(input.cwd, `novu-wizard-install-error-${slug}-${timestamp}.log`);
  const body = JSON.stringify(
    {
      command: input.command,
      exitCode: input.spawnResult.exitCode,
      stdout: input.spawnResult.stdout,
      stderr: input.spawnResult.stderr,
    },
    null,
    2
  );
  try {
    fs.writeFileSync(target, body, 'utf8');
  } catch {
    // best-effort
  }

  return target;
}

function applyPackageJsonFallback(target: InstallTarget, packages: string[]): string[] {
  const pkgPath = target.packageJsonPath;
  let raw: string;
  try {
    raw = fs.readFileSync(pkgPath, 'utf8');
  } catch {
    return [];
  }

  let json: { dependencies?: Record<string, string>; [key: string]: unknown };
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }

  const dependencies = { ...(json.dependencies ?? {}) };
  const edited: string[] = [];

  for (const pkg of packages) {
    if (dependencies[pkg]) continue;
    dependencies[pkg] = 'latest';
    edited.push(pkg);
  }

  if (edited.length === 0) return [];

  json.dependencies = dependencies;

  try {
    fs.writeFileSync(pkgPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  } catch {
    return [];
  }

  return edited;
}
