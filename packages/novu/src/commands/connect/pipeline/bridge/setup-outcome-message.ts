import type {
  AgentConnectMode,
  AiSdkConnectOutcome,
  ChatSdkConnectOutcome,
  CustomCodeConnectOutcome,
} from '../../types';
import { isVanillaCustomCodeConnectMode } from '../../types';

export type BridgeSetupOutcomes = {
  chatSdk?: ChatSdkConnectOutcome;
  aiSdk?: AiSdkConnectOutcome;
  customCode?: CustomCodeConnectOutcome;
};

function resolveChatSdkFollowUp(outcome: ChatSdkConnectOutcome): string | null {
  if (outcome.scaffolded) {
    if (outcome.tunnelAccepted) {
      return `Chat SDK app ready at ${outcome.projectDir}. Starting dev server and tunnel…`;
    }

    return null;
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

function resolveAiSdkFollowUp(outcome: AiSdkConnectOutcome): string | null {
  if (outcome.scaffolded && outcome.tunnelAccepted) {
    return null;
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

  if (!outcome.scaffolded) {
    return `Wire your agent code in ${outcome.projectDir} and point it at Novu.`;
  }

  return null;
}

function resolveCustomCodeFollowUp(outcome: CustomCodeConnectOutcome): string | null {
  if (outcome.scaffolded) {
    return null;
  }

  return `Wire your agent code in ${outcome.projectDir} and point it at Novu.`;
}

export function resolveBridgeSetupFollowUpMessage(
  connectMode: AgentConnectMode | undefined,
  outcomes: BridgeSetupOutcomes
): string | null {
  if (connectMode === 'chat-sdk' && outcomes.chatSdk) {
    return resolveChatSdkFollowUp(outcomes.chatSdk);
  }

  if (connectMode === 'ai-sdk' && outcomes.aiSdk) {
    return resolveAiSdkFollowUp(outcomes.aiSdk);
  }

  if (connectMode && isVanillaCustomCodeConnectMode(connectMode) && outcomes.customCode) {
    return resolveCustomCodeFollowUp(outcomes.customCode);
  }

  return null;
}
