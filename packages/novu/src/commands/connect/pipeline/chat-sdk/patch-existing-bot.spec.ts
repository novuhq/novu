import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hasNovuAdapterInBot } from "./detect-chat-layout";
import { patchExistingBot } from "./patch-existing-bot";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "novu-chat-sdk-patch-"));
  tempDirs.push(dir);

  return dir;
}

const BOT_SOURCE = `import { createSlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";

export const bot = new Chat({
  userName: process.env.BOT_USERNAME ?? "my-bot",
  adapters: {
    slack: createSlackAdapter(),
  },
  state: createMemoryState(),
});
`;

describe("patchExistingBot", () => {
  it("inserts novu adapter into an existing bot file", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, "src", "lib"), { recursive: true });
    const botPath = path.join(dir, "src", "lib", "bot.ts");
    fs.writeFileSync(botPath, BOT_SOURCE);

    const result = patchExistingBot(botPath);

    expect(result).toMatchObject({
      patched: true,
      alreadyWired: false,
      botFile: botPath,
    });

    const updated = fs.readFileSync(botPath, "utf8");
    expect(updated).toContain("from '@novu/chat-sdk-adapter'");
    expect(updated).toContain("novu: createNovuAdapter({");
    expect(updated).toContain("slack: createSlackAdapter()");
    expect(hasNovuAdapterInBot(botPath)).toBe(true);
  });

  it("is idempotent when novu adapter is already wired", () => {
    const dir = makeTempDir();
    const botPath = path.join(dir, "bot.ts");
    const wired = BOT_SOURCE.replace(
      "slack: createSlackAdapter(),",
      `slack: createSlackAdapter(),
    novu: createNovuAdapter({
      apiKey: process.env.NOVU_SECRET_KEY!,
      agentIdentifier: process.env.NOVU_AGENT_IDENTIFIER!,
      bridgeSecret: process.env.NOVU_SECRET_KEY!,
    }),`,
    );
    fs.writeFileSync(botPath, wired);

    const result = patchExistingBot(botPath);

    expect(result).toMatchObject({
      patched: false,
      alreadyWired: true,
      botFile: botPath,
    });
    expect(fs.readFileSync(botPath, "utf8")).toBe(wired);
  });

  it("fails gracefully when adapters block is missing", () => {
    const dir = makeTempDir();
    const botPath = path.join(dir, "bot.ts");
    fs.writeFileSync(botPath, "export const value = 1;");

    const result = patchExistingBot(botPath);

    expect(result.patched).toBe(false);
    expect(result.alreadyWired).toBe(false);
    expect(result.reason).toContain("adapters");
  });
});
