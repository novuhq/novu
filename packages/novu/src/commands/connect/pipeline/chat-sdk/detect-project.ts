import fs from 'node:fs';
import path from 'node:path';

import type { ChatSdkProjectKind } from '../../types';

const CHAT_SDK_ADAPTER_PACKAGE = '@novu/chat-sdk-adapter';

export type DetectedChatSdkProject = {
  kind: ChatSdkProjectKind;
  projectDir: string;
  packageJsonPath?: string;
};

type PackageJsonRead = { kind: 'missing' } | { kind: 'invalid' } | { kind: 'ok'; pkg: Record<string, unknown> };

function readPackageJson(projectDir: string): PackageJsonRead {
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return { kind: 'missing' };
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');

    return { kind: 'ok', pkg: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { kind: 'invalid' };
  }
}

function hasDependency(pkg: Record<string, unknown>, name: string): boolean {
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

  return sections.some((section) => {
    const deps = pkg[section];
    if (!deps || typeof deps !== 'object') {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(deps, name);
  });
}

export function detectChatSdkProject(projectDir: string): DetectedChatSdkProject {
  const resolvedDir = path.resolve(projectDir);
  const packageJson = readPackageJson(resolvedDir);

  // Only a truly missing package.json counts as empty (scaffold-eligible). A
  // malformed one means a real project is present — treat it as existing so we
  // wire it rather than scaffold over it.
  if (packageJson.kind === 'missing') {
    return { kind: 'empty', projectDir: resolvedDir };
  }

  if (packageJson.kind === 'ok' && hasDependency(packageJson.pkg, CHAT_SDK_ADAPTER_PACKAGE)) {
    return {
      kind: 'has-adapter',
      projectDir: resolvedDir,
      packageJsonPath: path.join(resolvedDir, 'package.json'),
    };
  }

  return {
    kind: 'existing',
    projectDir: resolvedDir,
    packageJsonPath: path.join(resolvedDir, 'package.json'),
  };
}

export function defaultScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-chat-sdk`;
}
