import type { AgentConnectMode, ChatSdkConnectOutcome } from "../../types";

export function resolveChatSdkOutcomeMessage(
  connectMode: AgentConnectMode | undefined,
  outcome: ChatSdkConnectOutcome | undefined,
): string | null {
  if (connectMode !== "chat-sdk" || !outcome) {
    return null;
  }

  if (outcome.scaffolded) {
    if (outcome.skippedInstall) {
      return "Chat SDK app scaffolded — run npm install first, then npm run dev:novu.";
    }

    return `Chat SDK app ready at ${outcome.projectDir}. Starting dev server and tunnel…`;
  }

  if (outcome.needsAgentFollowUp) {
    return "Skill installed — prompt your coding agent with the instructions above to wire the Novu adapter.";
  }

  if (outcome.projectKind === "has-adapter") {
    return "Novu adapter dependency detected — env updated. Verify bot wiring if this is a reconnect.";
  }

  return null;
}
