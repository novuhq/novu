import fs from "node:fs";
import path from "node:path";
import { hasNovuAdapterInBot } from "./detect-chat-layout";

const NOVU_ADAPTER_IMPORT =
  "import { createNovuAdapter } from '@novu/chat-sdk-adapter';";

const NOVU_ADAPTER_ENTRY = `novu: createNovuAdapter({
      apiKey: process.env.NOVU_SECRET_KEY!,
      agentIdentifier: process.env.NOVU_AGENT_IDENTIFIER!,
      bridgeSecret: process.env.NOVU_SECRET_KEY!,
      ...(process.env.NOVU_API_BASE_URL ? { apiBaseUrl: process.env.NOVU_API_BASE_URL } : {}),
    }),`;

export type PatchExistingBotResult = {
  patched: boolean;
  alreadyWired: boolean;
  botFile: string;
  reason?: string;
};

function hasSimpleAdaptersBlock(content: string): boolean {
  const adaptersIndex = content.indexOf("adapters:");
  if (adaptersIndex === -1) {
    return false;
  }

  const openBraceIndex = content.indexOf("{", adaptersIndex);
  if (openBraceIndex === -1) {
    return false;
  }

  let depth = 0;
  for (let index = openBraceIndex; index < content.length; index += 1) {
    const char = content[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return true;
      }
    }
  }

  return false;
}

function insertImport(content: string): string {
  if (
    content.includes(NOVU_ADAPTER_IMPORT) ||
    content.includes("from '@novu/chat-sdk-adapter'")
  ) {
    return content;
  }

  const lines = content.split("\n");
  let lastImportIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith("import ")) {
      lastImportIndex = index;
    }
  }

  if (lastImportIndex === -1) {
    return `${NOVU_ADAPTER_IMPORT}\n${content}`;
  }

  lines.splice(lastImportIndex + 1, 0, NOVU_ADAPTER_IMPORT);

  return lines.join("\n");
}

function insertNovuAdapter(content: string): string | null {
  const adaptersMatch = content.match(/adapters\s*:\s*\{/);
  if (!adaptersMatch || adaptersMatch.index === undefined) {
    return null;
  }

  const openBraceIndex = content.indexOf("{", adaptersMatch.index);
  if (openBraceIndex === -1) {
    return null;
  }

  const afterOpenBrace = openBraceIndex + 1;
  const before = content.slice(0, afterOpenBrace);
  const after = content.slice(afterOpenBrace);

  return `${before}\n    ${NOVU_ADAPTER_ENTRY}${after}`;
}

export function patchExistingBot(botFile: string): PatchExistingBotResult {
  const resolvedBotFile = path.resolve(botFile);

  if (!fs.existsSync(resolvedBotFile)) {
    return {
      patched: false,
      alreadyWired: false,
      botFile: resolvedBotFile,
      reason: "Bot file not found.",
    };
  }

  if (hasNovuAdapterInBot(resolvedBotFile)) {
    return {
      patched: false,
      alreadyWired: true,
      botFile: resolvedBotFile,
    };
  }

  const original = fs.readFileSync(resolvedBotFile, "utf8");
  if (!hasSimpleAdaptersBlock(original)) {
    return {
      patched: false,
      alreadyWired: false,
      botFile: resolvedBotFile,
      reason: "Could not find a simple adapters object literal to patch.",
    };
  }

  const withImport = insertImport(original);
  const patched = insertNovuAdapter(withImport);
  if (!patched) {
    return {
      patched: false,
      alreadyWired: false,
      botFile: resolvedBotFile,
      reason: "Could not insert Novu adapter into adapters block.",
    };
  }

  fs.writeFileSync(resolvedBotFile, patched, "utf8");

  return {
    patched: true,
    alreadyWired: false,
    botFile: resolvedBotFile,
  };
}
