import path from 'node:path';

import { detectChatSdkProject } from '../chat-sdk/detect-project';

export function detectCustomCodeProject(projectDir: string) {
  return detectChatSdkProject(projectDir);
}

export function defaultCustomCodeScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-agent`;
}

export function resolveCustomCodeAgentFilePath(projectDir: string, agentIdentifier: string): string {
  return path.join(projectDir, 'app', 'novu', 'agents', `${agentIdentifier}.tsx`);
}
