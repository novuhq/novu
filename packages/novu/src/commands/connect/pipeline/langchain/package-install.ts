import path from 'node:path';
import { installPackages } from '../../../init/helpers/install';
import { detectPackageManager } from '../../../step/utils/package-manager';
import { hasDependency, readProjectPackageJson } from '../bridge/project-package';

const FRAMEWORK_PACKAGE = '@novu/framework';
const LANGCHAIN_PACKAGE = 'langchain';
const LANGCHAIN_CORE_PACKAGE = '@langchain/core';

export const LANGCHAIN_SPEC = `${LANGCHAIN_PACKAGE}@^1.0.0`;
export const LANGCHAIN_CORE_SPEC = `${LANGCHAIN_CORE_PACKAGE}@^1.0.0`;

export type PackageInstallResult = {
  installed: boolean;
  command: string;
  packages: string[];
};

export type LangChainPackageStatus = { kind: 'ok' } | { kind: 'missing'; packages: string[] };

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
      return `npm install ${packageList} --no-workspaces`;
  }
}

export function resolveLangChainPackageStatus(projectDir: string): LangChainPackageStatus {
  const pkg = readProjectPackageJson(projectDir);
  if (!pkg) {
    return { kind: 'missing', packages: [FRAMEWORK_PACKAGE, LANGCHAIN_SPEC, LANGCHAIN_CORE_SPEC] };
  }

  const missing: string[] = [];
  if (!hasDependency(pkg, FRAMEWORK_PACKAGE)) {
    missing.push(FRAMEWORK_PACKAGE);
  }
  if (!hasDependency(pkg, LANGCHAIN_PACKAGE)) {
    missing.push(LANGCHAIN_SPEC);
  }
  if (!hasDependency(pkg, LANGCHAIN_CORE_PACKAGE)) {
    missing.push(LANGCHAIN_CORE_SPEC);
  }

  if (missing.length > 0) {
    return { kind: 'missing', packages: missing };
  }

  return { kind: 'ok' };
}

/** Packages the connect flow should offer to install for this project. */
export function resolveLangChainPackagesToInstall(projectDir: string): string[] {
  const status = resolveLangChainPackageStatus(projectDir);

  if (status.kind === 'missing') {
    return status.packages;
  }

  return [];
}

export function buildLangChainInstallCommand(projectDir: string): string {
  return buildInstallCommand(projectDir, resolveLangChainPackagesToInstall(projectDir));
}

export async function runLangChainPackageInstall(opts: {
  projectDir: string;
  silent?: boolean;
}): Promise<PackageInstallResult> {
  const projectDir = path.resolve(opts.projectDir);
  const packages = resolveLangChainPackagesToInstall(projectDir);
  const command = buildLangChainInstallCommand(projectDir);

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
