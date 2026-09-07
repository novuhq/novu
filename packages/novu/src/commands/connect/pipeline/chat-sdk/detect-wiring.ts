import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIRS = ['lib', 'src', 'app'] as const;

const ADAPTER_PATTERN = /createNovuAdapter\s*\(/;
const BRIDGE_ROUTE_PATTERNS = [/webhooks[/\\]novu[/\\]route\.(ts|tsx|js|jsx|mjs)$/, /webhooks\.novu/];

export type WiringDetection = {
  hasAdapterCall: boolean;
  hasBridgeRoute: boolean;
  isWired: boolean;
};

function listSourceFiles(projectDir: string): string[] {
  const files: string[] = [];

  for (const dirName of SOURCE_DIRS) {
    const dir = path.join(projectDir, dirName);
    if (!fs.existsSync(dir)) {
      continue;
    }

    walkDir(dir, files);
  }

  return files;
}

function walkDir(dir: string, files: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, files);
      continue;
    }

    if (/\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
}

export function detectChatSdkWiring(projectDir: string): WiringDetection {
  const resolvedDir = path.resolve(projectDir);
  const files = listSourceFiles(resolvedDir);

  let hasAdapterCall = false;
  let hasBridgeRoute = false;

  for (const filePath of files) {
    const relative = path.relative(resolvedDir, filePath).replace(/\\/g, '/');
    let contents: string;

    try {
      contents = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    if (ADAPTER_PATTERN.test(contents)) {
      hasAdapterCall = true;
    }

    if (BRIDGE_ROUTE_PATTERNS.some((pattern) => pattern.test(relative))) {
      hasBridgeRoute = true;
    }
  }

  return {
    hasAdapterCall,
    hasBridgeRoute,
    isWired: hasAdapterCall && hasBridgeRoute,
  };
}
