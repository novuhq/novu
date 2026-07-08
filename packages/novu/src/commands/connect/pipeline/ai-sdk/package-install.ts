import path from 'node:path';
import { installPackages } from '../../../init/helpers/install';
import { detectPackageManager } from '../../../step/utils/package-manager';
import { hasDependency, readProjectPackageJson } from '../bridge/project-package';

const FRAMEWORK_PACKAGE = '@novu/framework';
const AI_CORE_PACKAGE = 'ai';

export type PackageInstallResult = {
  installed: boolean;
  command: string;
  packages: string[];
};

/** Packages the connect flow should offer to install for this project. */
export function resolveAiSdkPackagesToInstall(projectDir: string): string[] {
  const pkg = readProjectPackageJson(projectDir);
  if (!pkg) {
    return [FRAMEWORK_PACKAGE, AI_CORE_PACKAGE];
  }

  const missing: string[] = [];
  if (!hasDependency(pkg, FRAMEWORK_PACKAGE)) {
    missing.push(FRAMEWORK_PACKAGE);
  }
  if (!hasDependency(pkg, AI_CORE_PACKAGE)) {
    missing.push(AI_CORE_PACKAGE);
  }

  return missing;
}

export function buildAiSdkInstallCommand(projectDir: string): string {
  const packages = resolveAiSdkPackagesToInstall(projectDir);
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
