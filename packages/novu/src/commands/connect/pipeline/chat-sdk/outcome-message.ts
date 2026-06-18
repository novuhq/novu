import type { AgentConnectMode, ChatSdkConnectOutcome } from '../../types';

export function resolveChatSdkOutcomeMessage(
  connectMode: AgentConnectMode | undefined,
  outcome: ChatSdkConnectOutcome | undefined
): string | null {
  if (connectMode !== 'chat-sdk' || !outcome) {
    return null;
  }

  if (outcome.scaffolded) {
    if (outcome.skippedInstall) {
      return 'Chat SDK app scaffolded — run npm install first, then npm run dev:novu.';
    }

    if (outcome.tunnelAccepted) {
      return `Chat SDK app ready at ${outcome.projectDir}. Starting dev server and tunnel…`;
    }

    return `Chat SDK app ready at ${outcome.projectDir}. Run npm run dev:novu to start the tunnel.`;
  }

  if (outcome.coreReady && outcome.tunnelAccepted) {
    return 'Project configured — starting dev server and tunnel…';
  }

  if (outcome.coreReady) {
    return 'Project configured. Run npm run dev:novu to start the tunnel.';
  }

  const manual = outcome.requirements?.filter((req) => req.status !== 'ok') ?? [];
  if (manual.length > 0) {
    return `Finish setup: ${manual.map((req) => req.detail).join('; ')}`;
  }

  return null;
}
