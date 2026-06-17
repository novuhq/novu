import fs from "node:fs";
import path from "node:path";

const CHAT_CONSTRUCTOR_PATTERN = /new\s+Chat\s*\(/;
const WEBHOOK_DISPATCH_PATTERN = /\.webhooks\s*[[.]/;
const NOVU_ADAPTER_PATTERN = /createNovuAdapter\s*\(/;
const NOVU_ADAPTER_KEY_PATTERN = /\badapters\s*:\s*\{[^}]*\bnovu\s*:/s;

const SEARCH_ROOTS = ["app", "src", "lib"] as const;
const MAX_SEARCH_DEPTH = 8;

export type ChatSdkLayout =
  | { mode: "merge-existing"; botFile: string; webhookRoute: string }
  | { mode: "scaffold-novu-module" }
  | { mode: "skill-only"; reason: string; botFile?: string };

export type ChatLayoutDetection = {
  layout: ChatSdkLayout;
  botFiles: string[];
  duplicateNovuModuleDetected: boolean;
};

function readTextFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function isSourceFile(name: string): boolean {
  return name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".mts");
}

function walkSourceFiles(rootDir: string, maxDepth: number): string[] {
  const results: string[] = [];

  function walk(currentDir: string, depth: number): void {
    if (depth > maxDepth || !fs.existsSync(currentDir)) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "dist"
      ) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
        continue;
      }

      if (isSourceFile(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  walk(rootDir, 0);

  return results;
}

function isNovuAgentModule(filePath: string): boolean {
  const normalized = filePath.split(path.sep).join("/");

  return (
    normalized.includes("/lib/novu/agent.") ||
    normalized.endsWith("lib/novu/agent.ts")
  );
}

export function findChatBotFiles(projectDir: string): string[] {
  const resolvedDir = path.resolve(projectDir);
  const candidates: string[] = [];

  for (const root of SEARCH_ROOTS) {
    const rootPath = path.join(resolvedDir, root);
    if (!fs.existsSync(rootPath)) {
      continue;
    }

    for (const filePath of walkSourceFiles(rootPath, MAX_SEARCH_DEPTH)) {
      const content = readTextFile(filePath);
      if (!content || !CHAT_CONSTRUCTOR_PATTERN.test(content)) {
        continue;
      }

      candidates.push(filePath);
    }
  }

  const nonNovuModules = candidates.filter(
    (filePath) => !isNovuAgentModule(filePath),
  );
  if (nonNovuModules.length > 0) {
    return nonNovuModules;
  }

  return candidates;
}

function routeUsesWebhookDispatch(content: string): boolean {
  return WEBHOOK_DISPATCH_PATTERN.test(content);
}

export function findPlatformWebhookRoute(projectDir: string): string | null {
  const resolvedDir = path.resolve(projectDir);
  const routeCandidates = [
    path.join(resolvedDir, "app", "api", "webhooks", "[platform]", "route.ts"),
    path.join(
      resolvedDir,
      "src",
      "app",
      "api",
      "webhooks",
      "[platform]",
      "route.ts",
    ),
  ];

  for (const routePath of routeCandidates) {
    if (!fs.existsSync(routePath)) {
      continue;
    }

    const content = readTextFile(routePath);
    if (content && routeUsesWebhookDispatch(content)) {
      return routePath;
    }
  }

  return null;
}

export function hasNovuAdapterInBot(filePath: string): boolean {
  const content = readTextFile(filePath);
  if (!content) {
    return false;
  }

  return (
    NOVU_ADAPTER_PATTERN.test(content) || NOVU_ADAPTER_KEY_PATTERN.test(content)
  );
}

export function hasDuplicateNovuModule(
  projectDir: string,
  botFiles: string[],
): boolean {
  const resolvedDir = path.resolve(projectDir);
  const novuAgentPaths = [
    path.join(resolvedDir, "lib", "novu", "agent.ts"),
    path.join(resolvedDir, "src", "lib", "novu", "agent.ts"),
  ];

  const hasNovuAgentModule = novuAgentPaths.some((filePath) =>
    fs.existsSync(filePath),
  );
  if (!hasNovuAgentModule) {
    return false;
  }

  return botFiles.some((botFile) => !isNovuAgentModule(botFile));
}

export function detectChatSdkLayout(projectDir: string): ChatLayoutDetection {
  const botFiles = findChatBotFiles(projectDir);
  const webhookRoute = findPlatformWebhookRoute(projectDir);
  const duplicateNovuModuleDetected = hasDuplicateNovuModule(
    projectDir,
    botFiles,
  );

  if (botFiles.length === 1 && webhookRoute) {
    return {
      layout: {
        mode: "merge-existing",
        botFile: botFiles[0],
        webhookRoute,
      },
      botFiles,
      duplicateNovuModuleDetected,
    };
  }

  if (botFiles.length === 0) {
    return {
      layout: { mode: "scaffold-novu-module" },
      botFiles,
      duplicateNovuModuleDetected,
    };
  }

  if (botFiles.length > 1) {
    return {
      layout: {
        mode: "skill-only",
        reason:
          "Multiple Chat instances found — merge manually into a single bot file.",
      },
      botFiles,
      duplicateNovuModuleDetected,
    };
  }

  return {
    layout: {
      mode: "skill-only",
      reason:
        "No platform webhook route found — add a [platform] route or wire Novu manually.",
      botFile: botFiles[0],
    },
    botFiles,
    duplicateNovuModuleDetected,
  };
}
