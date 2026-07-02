import fs from 'node:fs';
import path from 'node:path';

export const CHAT_SDK_ADAPTER_PACKAGE = '@novu/chat-sdk-adapter';

const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

export function readProjectPackageJson(projectDir: string): Record<string, unknown> | null {
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function hasDependency(pkg: Record<string, unknown>, name: string): boolean {
  return DEPENDENCY_SECTIONS.some((section) => {
    const deps = pkg[section];
    if (!deps || typeof deps !== 'object') {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(deps, name);
  });
}
