import fs from 'node:fs';
import path from 'node:path';

export function defaultCustomCodeScaffoldDirName(agentIdentifier: string): string {
  return `${agentIdentifier}-agent`;
}

export function resolveAgentHandlerPathIfExists(projectDir: string, agentIdentifier: string): string | undefined {
  const filePath = path.join(projectDir, 'app', 'novu', 'agents', `${agentIdentifier}.tsx`);

  return fs.existsSync(filePath) ? filePath : undefined;
}
