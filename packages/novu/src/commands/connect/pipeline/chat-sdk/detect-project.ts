import fs from 'node:fs';
import path from 'node:path';

import type { ChatSdkProjectKind } from '../../types';

const CHAT_SDK_ADAPTER_PACKAGE = '@novu/chat-sdk-adapter';
const CHAT_SDK_PACKAGE = 'chat';

export type DetectedChatSdkProject = {
  kind: ChatSdkProjectKind;
  projectDir: string;
  packageJsonPath?: string;
};

function readPackageJson(projectDir: string): Record<string, unknown> | null {
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');

    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
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

function hasChatSdkAdapter(pkg: Record<string, unknown>): boolean {
  return hasDependency(pkg, CHAT_SDK_ADAPTER_PACKAGE) || hasDependency(pkg, CHAT_SDK_PACKAGE);
}

export function detectChatSdkProject(projectDir: string): DetectedChatSdkProject {
  const resolvedDir = path.resolve(projectDir);
  const packageJson = readPackageJson(resolvedDir);

  if (!packageJson) {
    return { kind: 'empty', projectDir: resolvedDir };
  }

  if (hasChatSdkAdapter(packageJson)) {
    return {
      kind: 'has-adapter',
      projectDir: resolvedDir,
      packageJsonPath: path.join(resolvedDir, 'package.json'),
    };
  }

  return {
    kind: 'project-no-adapter',
    projectDir: resolvedDir,
    packageJsonPath: path.join(resolvedDir, 'package.json'),
  };
}

export function defaultScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-chat-sdk`;
}
