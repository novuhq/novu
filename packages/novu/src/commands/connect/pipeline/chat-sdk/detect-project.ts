import path from 'node:path';

import type { ChatSdkProjectKind } from '../../types';
import { readProjectPackageJson } from './project-package';

export type DetectedChatSdkProject = {
  kind: ChatSdkProjectKind;
  projectDir: string;
  packageJsonPath?: string;
};

export function detectChatSdkProject(projectDir: string): DetectedChatSdkProject {
  const resolvedDir = path.resolve(projectDir);
  const pkg = readProjectPackageJson(resolvedDir);

  // Only a truly missing package.json counts as empty (scaffold-eligible). A
  // malformed one means a real project is present — treat it as project so we
  // wire it rather than scaffold over it.
  if (!pkg) {
    return { kind: 'empty', projectDir: resolvedDir };
  }

  return {
    kind: 'project',
    projectDir: resolvedDir,
    packageJsonPath: path.join(resolvedDir, 'package.json'),
  };
}

export function defaultScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-chat-sdk`;
}
