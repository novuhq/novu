import path from 'node:path';
import { formatNpmInstallCommand, installPackages } from '../../../init/helpers/install';
import { detectPackageManager } from '../../../step/utils/package-manager';
import { getDependencyVersion, hasDependency, readProjectPackageJson } from '../bridge/project-package';

const FRAMEWORK_PACKAGE = '@novu/framework';
const AI_CORE_PACKAGE = 'ai';
export const AI_SDK_V7_SPEC = `${AI_CORE_PACKAGE}@^7.0.0`;

export type PackageInstallResult = {
  installed: boolean;
  command: string;
  packages: string[];
};

export type AiSdkPackageStatus =
  | { kind: 'ok' }
  | { kind: 'missing'; packages: string[] }
  | { kind: 'incompatible-ai'; declaredVersion: string };

function isAiSdkV7Declared(version: string): boolean {
  const trimmed = version.trim();

  if (/^(file:|workspace:|link:)/.test(trimmed)) {
    return true;
  }

  const match = trimmed.match(/(\d+)/);
  if (!match) {
    return true;
  }

  return Number.parseInt(match[1], 10) >= 7;
}

function buildInstallCommand(projectDir: string, packages: string[]): string {
  if (packages.length === 0) {
    return '';
  }

  const packageManager = detectPackageManager(projectDir);
  const packageList = packages.join(' ');

  switch (packageManager) {
    case 'pnpm':
      return `pnpm add ${packageList}`;
    case 'yarn':
      return `yarn add ${packageList}`;
    case 'bun':
      return `bun add ${packageList}`;
    default:
      return formatNpmInstallCommand(packages);
  }
}

export function resolveAiSdkPackageStatus(projectDir: string): AiSdkPackageStatus {
  const pkg = readProjectPackageJson(projectDir);
  if (!pkg) {
    return { kind: 'missing', packages: [FRAMEWORK_PACKAGE, AI_SDK_V7_SPEC] };
  }

  const aiVersion = getDependencyVersion(pkg, AI_CORE_PACKAGE);
  if (aiVersion && !isAiSdkV7Declared(aiVersion)) {
    return { kind: 'incompatible-ai', declaredVersion: aiVersion };
  }

  const missing: string[] = [];
  if (!hasDependency(pkg, FRAMEWORK_PACKAGE)) {
    missing.push(FRAMEWORK_PACKAGE);
  }
  if (!hasDependency(pkg, AI_CORE_PACKAGE)) {
    missing.push(AI_SDK_V7_SPEC);
  }

  if (missing.length > 0) {
    return { kind: 'missing', packages: missing };
  }

  return { kind: 'ok' };
}

/** Packages the connect flow should offer to install for this project. */
export function resolveAiSdkPackagesToInstall(projectDir: string): string[] {
  const status = resolveAiSdkPackageStatus(projectDir);

  if (status.kind === 'missing') {
    return status.packages;
  }

  return [];
}

export function buildAiSdkInstallCommand(projectDir: string): string {
  return buildInstallCommand(projectDir, resolveAiSdkPackagesToInstall(projectDir));
}

export function buildAiSdkUpgradeCommand(projectDir: string): string {
  return buildInstallCommand(projectDir, [AI_SDK_V7_SPEC]);
}

export async function runAiSdkPackageInstall(opts: {
  projectDir: string;
  silent?: boolean;
}): Promise<PackageInstallResult> {
  const projectDir = path.resolve(opts.projectDir);
  const packages = resolveAiSdkPackagesToInstall(projectDir);
  const command = buildAiSdkInstallCommand(projectDir);

  if (packages.length === 0) {
    return { installed: false, command: '', packages: [] };
  }

  const packageManager = detectPackageManager(projectDir);

  await installPackages(packageManager, packages, {
    cwd: projectDir,
    silent: opts.silent ?? false,
    isOnline: true,
  });

  return { installed: true, command, packages };
}
