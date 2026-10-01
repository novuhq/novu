import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIRS = ['lib', 'src', 'app', 'components', 'pages'] as const;

const NOVU_REACT_IMPORT = /@novu\/react/;
const USE_WEB_CHAT = /\buseWebChat\b/;

export type WebChatUiWiringDetection = {
  hasNovuReact: boolean;
  hasUseWebChat: boolean;
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

export function detectWebChatUiWiring(projectDir: string): WebChatUiWiringDetection {
  const resolvedDir = path.resolve(projectDir);
  const files = listSourceFiles(resolvedDir);

  let hasNovuReact = false;
  let hasUseWebChat = false;

  for (const filePath of files) {
    let contents: string;

    try {
      contents = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    if (NOVU_REACT_IMPORT.test(contents)) {
      hasNovuReact = true;
    }

    if (USE_WEB_CHAT.test(contents)) {
      hasUseWebChat = true;
    }
  }

  return {
    hasNovuReact,
    hasUseWebChat,
    isWired: hasNovuReact && hasUseWebChat,
  };
}
