import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  detectChatSdkLayout,
  findChatBotFiles,
  findPlatformWebhookRoute,
  hasDuplicateNovuModule,
  hasNovuAdapterInBot,
} from "./detect-chat-layout";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "novu-chat-sdk-layout-"));
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

const PLATFORM_ROUTE_SOURCE = `import { after } from "next/server";
import { bot } from "@/lib/bot";

type Platform = keyof typeof bot.webhooks;

interface Context {
  params: Promise<{ platform: string }>;
}

async function handleRequest(request: Request, context: Context) {
  const { platform } = await context.params;
  const handler = bot.webhooks[platform as Platform];
  if (!handler) {
    return new Response(\`Unknown platform: \${platform}\`, { status: 404 });
  }
  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}

export const GET = handleRequest;
export const POST = handleRequest;
`;

const NOVU_AGENT_SOURCE = `import { createNovuAdapter } from '@novu/chat-sdk-adapter';
import { Chat } from 'chat';

export function getNovuAgent() {
  const chat = new Chat({
    adapters: { novu: createNovuAdapter({ apiKey: 'x', agentIdentifier: 'y', bridgeSecret: 'x' }) },
  });
  return chat;
}
`;

describe("detectChatSdkLayout", () => {
  it("detects merge-existing for a standard my-bot layout", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, "src", "lib"), { recursive: true });
    fs.mkdirSync(
      path.join(dir, "src", "app", "api", "webhooks", "[platform]"),
      { recursive: true },
    );
    fs.writeFileSync(path.join(dir, "src", "lib", "bot.ts"), BOT_SOURCE);
    fs.writeFileSync(
      path.join(dir, "src", "app", "api", "webhooks", "[platform]", "route.ts"),
      PLATFORM_ROUTE_SOURCE,
    );

    const detection = detectChatSdkLayout(dir);

    expect(detection.layout).toEqual({
      mode: "merge-existing",
      botFile: path.join(dir, "src", "lib", "bot.ts"),
      webhookRoute: path.join(
        dir,
        "src",
        "app",
        "api",
        "webhooks",
        "[platform]",
        "route.ts",
      ),
    });
    expect(detection.duplicateNovuModuleDetected).toBe(false);
  });

  it("classifies greenfield projects as scaffold-novu-module", () => {
    const dir = makeTempDir();
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "empty-app" }),
    );

    expect(detectChatSdkLayout(dir).layout).toEqual({
      mode: "scaffold-novu-module",
    });
  });

  it("classifies multiple Chat files as skill-only", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, "src", "lib"), { recursive: true });
    fs.mkdirSync(
      path.join(dir, "src", "app", "api", "webhooks", "[platform]"),
      { recursive: true },
    );
    fs.writeFileSync(path.join(dir, "src", "lib", "bot.ts"), BOT_SOURCE);
    fs.writeFileSync(path.join(dir, "src", "lib", "other-bot.ts"), BOT_SOURCE);
    fs.writeFileSync(
      path.join(dir, "src", "app", "api", "webhooks", "[platform]", "route.ts"),
      PLATFORM_ROUTE_SOURCE,
    );

    const detection = detectChatSdkLayout(dir);

    expect(detection.layout.mode).toBe("skill-only");
    if (detection.layout.mode === "skill-only") {
      expect(detection.layout.reason).toContain("Multiple Chat instances");
    }
  });

  it("classifies a single bot without platform route as skill-only", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, "src", "lib"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "lib", "bot.ts"), BOT_SOURCE);

    const detection = detectChatSdkLayout(dir);

    expect(detection.layout.mode).toBe("skill-only");
    if (detection.layout.mode === "skill-only") {
      expect(detection.layout.botFile).toBe(
        path.join(dir, "src", "lib", "bot.ts"),
      );
    }
  });

  it("flags duplicate novu module when bot.ts and lib/novu/agent.ts both exist", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, "src", "lib", "novu"), { recursive: true });
    fs.mkdirSync(
      path.join(dir, "src", "app", "api", "webhooks", "[platform]"),
      { recursive: true },
    );
    fs.writeFileSync(path.join(dir, "src", "lib", "bot.ts"), BOT_SOURCE);
    fs.writeFileSync(
      path.join(dir, "src", "lib", "novu", "agent.ts"),
      NOVU_AGENT_SOURCE,
    );
    fs.writeFileSync(
      path.join(dir, "src", "app", "api", "webhooks", "[platform]", "route.ts"),
      PLATFORM_ROUTE_SOURCE,
    );

    const botFiles = findChatBotFiles(dir);

    expect(botFiles).toEqual([path.join(dir, "src", "lib", "bot.ts")]);
    expect(hasDuplicateNovuModule(dir, botFiles)).toBe(true);
    expect(detectChatSdkLayout(dir).duplicateNovuModuleDetected).toBe(true);
  });

  it("detects novu adapter already present in bot file", () => {
    const dir = makeTempDir();
    const botWithNovu = BOT_SOURCE.replace(
      "slack: createSlackAdapter(),",
      `slack: createSlackAdapter(),
    novu: createNovuAdapter({
      apiKey: process.env.NOVU_SECRET_KEY!,
      agentIdentifier: process.env.NOVU_AGENT_IDENTIFIER!,
      bridgeSecret: process.env.NOVU_SECRET_KEY!,
    }),`,
    );
    fs.mkdirSync(path.join(dir, "src", "lib"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "lib", "bot.ts"), botWithNovu);

    expect(hasNovuAdapterInBot(path.join(dir, "src", "lib", "bot.ts"))).toBe(
      true,
    );
  });

  it("finds platform webhook route at app root", () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, "app", "api", "webhooks", "[platform]"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(dir, "app", "api", "webhooks", "[platform]", "route.ts"),
      PLATFORM_ROUTE_SOURCE,
    );

    expect(findPlatformWebhookRoute(dir)).toBe(
      path.join(dir, "app", "api", "webhooks", "[platform]", "route.ts"),
    );
  });
});
