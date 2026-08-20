import type {
  AgentConnectMode,
  AiSdkConnectOutcome,
  ChatSdkConnectOutcome,
  LangChainConnectOutcome,
} from '../../types';
import type { BridgeTunnelOfferResult } from '../../ui/ui';
import { aiSdkAdapter } from '../ai-sdk/adapter';
import { buildDevNovuScript as buildAiSdkDevNovuScript } from '../ai-sdk/dev-script';
import { buildDevNovuScript as buildChatSdkDevNovuScript } from '../chat-sdk/dev-script';
import { langChainAdapter } from '../langchain/adapter';

type DeferredTunnelBridgeOutcome = AiSdkConnectOutcome | LangChainConnectOutcome | ChatSdkConnectOutcome;

export async function offerDeferredBridgeTunnelIfReady(input: {
  offerBridgeTunnel: (opts: { projectDir: string; devCommand: string }) => Promise<BridgeTunnelOfferResult>;
  connectMode: AgentConnectMode;
  bridgeOutcome?: AiSdkConnectOutcome | LangChainConnectOutcome | ChatSdkConnectOutcome;
  projectDir: string;
  ci?: boolean;
}): Promise<boolean> {
  if (input.ci || !input.bridgeOutcome || !('coreReady' in input.bridgeOutcome)) {
    return false;
  }

  const outcome = input.bridgeOutcome as DeferredTunnelBridgeOutcome;
  if (!outcome.coreReady || outcome.tunnelAccepted) {
    return false;
  }

  if (outcome.skippedInstall) {
    return false;
  }

  const adapter =
    input.connectMode === 'chat-sdk'
      ? null
      : input.connectMode === 'langchain'
        ? langChainAdapter
        : input.connectMode === 'ai-sdk'
          ? aiSdkAdapter
          : null;

  if (input.connectMode === 'chat-sdk') {
    if (!isChatSdkWiringReadyForTunnel(outcome.requirements, input.projectDir, outcome.scaffolded)) {
      return false;
    }
  } else if (adapter) {
    if (!isBridgeAdapterWiringReadyForTunnel(adapter, outcome.requirements, input.projectDir, outcome.scaffolded)) {
      return false;
    }
  } else {
    return false;
  }

  const devCommand =
    input.connectMode === 'chat-sdk'
      ? buildChatSdkDevNovuScript(input.projectDir)
      : buildAiSdkDevNovuScript(input.projectDir);

  const choice = await input.offerBridgeTunnel({
    projectDir: input.projectDir,
    devCommand,
  });

  return choice === 'accept';
}

function isBridgeAdapterWiringReadyForTunnel(
  adapter: typeof aiSdkAdapter,
  requirements: DeferredTunnelBridgeOutcome['requirements'],
  projectDir: string,
  scaffolded = false
): boolean {
  if (scaffolded) {
    return true;
  }

  const wiring = requirements?.find((req) => req.id === 'code-wiring');
  if (wiring) {
    return wiring.status === 'ok';
  }

  return adapter.detectIsWired(projectDir);
}

function isChatSdkWiringReadyForTunnel(
  requirements: DeferredTunnelBridgeOutcome['requirements'],
  projectDir: string,
  scaffolded = false
): boolean {
  if (scaffolded) {
    return true;
  }

  const wiring = requirements?.find((req) => req.id === 'code-wiring');

  return wiring?.status === 'ok';
}

export function applyDeferredTunnelAcceptance(
  bridgeOutcome: AiSdkConnectOutcome | LangChainConnectOutcome | ChatSdkConnectOutcome | undefined,
  accepted: boolean
): void {
  if (!accepted || !bridgeOutcome || !('coreReady' in bridgeOutcome)) {
    return;
  }

  (bridgeOutcome as DeferredTunnelBridgeOutcome).tunnelAccepted = true;
}
