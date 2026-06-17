import { describe, expect, it } from "vitest";
import { buildChatSdkAgentPrompt } from "./skill-instructions";

describe("buildChatSdkAgentPrompt", () => {
  it("focuses on code wiring and dev:novu tunnel without env edits", () => {
    const prompt = buildChatSdkAgentPrompt({
      projectDir: "/tmp/my-bot",
    });

    expect(prompt).toContain("novu-chat-sdk skill");
    expect(prompt).toContain("/tmp/my-bot");
    expect(prompt).toContain("Do not modify .env or .env.local");
    expect(prompt).toContain("dev:novu");
    expect(prompt).toContain("npx novu dev");
    expect(prompt).toContain("--route /api/webhooks/novu");
    expect(prompt).toContain("registers the tunneled bridge URL");
    expect(prompt).not.toContain("Wire NOVU_SECRET_KEY");
    expect(prompt).not.toContain("update .env.local");
    expect(prompt).not.toContain("Secret key");
  });
});
