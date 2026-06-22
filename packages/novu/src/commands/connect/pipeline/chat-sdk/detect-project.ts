import fs from 'node:fs';
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
  const packageJsonPath = path.join(resolvedDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return { kind: 'empty', projectDir: resolvedDir };
  }

  const pkg = readProjectPackageJson(resolvedDir);
  if (!pkg) {
    throw new Error(
      `Found package.json but could not parse it (${packageJsonPath}). Fix the JSON syntax before running novu connect.`
    );
  }

  return {
    kind: 'project',
    projectDir: resolvedDir,
    packageJsonPath,
  };
}

export function defaultScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-chat-sdk`;
}
