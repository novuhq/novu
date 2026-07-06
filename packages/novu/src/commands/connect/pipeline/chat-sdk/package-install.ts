import path from 'node:path';
import { installPackages } from '../../../init/helpers/install';
import { detectPackageManager } from '../../../step/utils/package-manager';
import { hasDependency, readProjectPackageJson } from './project-package';

const CHAT_SDK_ADAPTER_PACKAGE = '@novu/chat-sdk-adapter';
const CHAT_PACKAGE = 'chat';
const CHAT_PACKAGE_SPEC = 'chat@4.31.0';
const STATE_ADAPTER_PREFIX = '@chat-adapter/state-';
const DEFAULT_STATE_ADAPTER_SPEC = '@chat-adapter/state-memory@4.31.0';

export type PackageInstallResult = {
  installed: boolean;
  command: string;
  packages: string[];
};

export function hasStateAdapter(pkg: Record<string, unknown>): boolean {
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

  return sections.some((section) => {
    const deps = pkg[section];
    if (!deps || typeof deps !== 'object') {
      return false;
    }

    return Object.keys(deps as Record<string, string>).some((name) => name.startsWith(STATE_ADAPTER_PREFIX));
  });
}

/** Packages the connect flow should offer to install for this project. */
export function resolveChatSdkPackagesToInstall(projectDir: string): string[] {
  const pkg = readProjectPackageJson(projectDir);
  if (!pkg) {
    return [CHAT_SDK_ADAPTER_PACKAGE, CHAT_PACKAGE_SPEC, DEFAULT_STATE_ADAPTER_SPEC];
  }

  const packages: string[] = [];

  if (!hasDependency(pkg, CHAT_SDK_ADAPTER_PACKAGE)) {
    packages.push(CHAT_SDK_ADAPTER_PACKAGE);
  }

  if (!hasDependency(pkg, CHAT_PACKAGE)) {
    packages.push(CHAT_PACKAGE_SPEC);
  }

  if (!hasStateAdapter(pkg)) {
    packages.push(DEFAULT_STATE_ADAPTER_SPEC);
  }

  return packages;
}

export function buildChatSdkInstallCommand(projectDir: string): string {
  const packages = resolveChatSdkPackagesToInstall(projectDir);
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

export async function runChatSdkPackageInstall(opts: {
  projectDir: string;
  silent?: boolean;
}): Promise<PackageInstallResult> {
  const projectDir = path.resolve(opts.projectDir);
  const packages = resolveChatSdkPackagesToInstall(projectDir);
  const packageManager = detectPackageManager(projectDir);
  const command = buildChatSdkInstallCommand(projectDir);

  if (packages.length === 0) {
    return { installed: false, command: '', packages: [] };
  }

  await installPackages(packageManager, packages, {
    cwd: projectDir,
    silent: opts.silent ?? false,
    isOnline: true,
  });

  return { installed: true, command, packages };
}
