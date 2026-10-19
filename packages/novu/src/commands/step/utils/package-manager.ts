import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export function hasZodV3(rootDir: string): boolean {
  try {
    const zodPkgPath = path.join(rootDir, 'node_modules', 'zod', 'package.json');

    if (!fs.existsSync(zodPkgPath)) return false;

    const pkg = JSON.parse(fs.readFileSync(zodPkgPath, 'utf8')) as { version?: string };
    const major = parseInt((pkg.version ?? '').split('.')[0], 10);

    return major === 3;
  } catch {
    return false;
  }
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export function detectPackageManager(rootDir: string): PackageManager {
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(rootDir, 'bun.lockb')) || fs.existsSync(path.join(rootDir, 'bun.lock'))) return 'bun';

  return 'npm';
}

export function isPackageInstalled(packageName: string, rootDir: string): boolean {
  if (fs.existsSync(path.join(rootDir, 'node_modules', packageName))) return true;

  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

    return !!(pkgJson.dependencies?.[packageName] || pkgJson.devDependencies?.[packageName]);
  } catch {
    return false;
  }
}

export function getInstallCommand(packageManager: PackageManager, packageName: string): string {
  switch (packageManager) {
    case 'pnpm':
      return `pnpm add --save-dev ${packageName}`;
    case 'yarn':
      return `yarn add --dev ${packageName}`;
    case 'bun':
      return `bun add --dev ${packageName}`;
    default:
      return `npm install --save-dev ${packageName}`;
  }
}

export function installPackageSync(packageName: string, rootDir: string): void {
  const pm = detectPackageManager(rootDir);
  const cmd = getInstallCommand(pm, packageName);

  execSync(cmd, { cwd: rootDir, stdio: 'pipe' });
}
