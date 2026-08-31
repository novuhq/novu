import type {
  AgentConnectMode,
  AiSdkConnectOutcome,
  ChatSdkConnectOutcome,
  ConnectWebChatHandoff,
  LangChainConnectOutcome,
} from '../../types';
import { isBridgeConnectMode } from '../../types';
import { promptBridgeTunnelInConsole } from '../../ui/console-bridge-reconcile-prompts';
import { aiSdkAdapter } from '../ai-sdk/adapter';
import { buildDevNovuScript as buildAiSdkDevNovuScript } from '../ai-sdk/dev-script';
import { isBridgeAdapterWiringReadyForTunnel } from '../bridge-adapter/engine';
import { isChatSdkWiringReadyForTunnel } from '../chat-sdk';
import { buildDevNovuScript as buildChatSdkDevNovuScript } from '../chat-sdk/dev-script';
import { langChainAdapter } from '../langchain/adapter';

type DeferredBridgeOutcome = AiSdkConnectOutcome | LangChainConnectOutcome | ChatSdkConnectOutcome;

export async function offerPostConnectBridgeTunnel(input: {
  connectMode: AgentConnectMode;
  chatSdkOutcome?: ChatSdkConnectOutcome;
  aiSdkOutcome?: AiSdkConnectOutcome;
  langChainOutcome?: LangChainConnectOutcome;
  webChatHandoff?: ConnectWebChatHandoff;
  webChatProjectDir?: string;
  ci?: boolean;
}): Promise<boolean> {
  if (input.ci || !input.webChatHandoff || !isBridgeConnectMode(input.connectMode)) {
    return false;
  }

  const bridgeOutcome = (input.chatSdkOutcome ?? input.aiSdkOutcome ?? input.langChainOutcome) as
    | DeferredBridgeOutcome
    | undefined;

  if (!bridgeOutcome || !('coreReady' in bridgeOutcome)) {
    return false;
  }

  if (!bridgeOutcome.coreReady || bridgeOutcome.tunnelAccepted || bridgeOutcome.skippedInstall) {
    return false;
  }

  const projectDir = input.webChatProjectDir ?? bridgeOutcome.projectDir;
  const adapter =
    input.connectMode === 'langchain' ? langChainAdapter : input.connectMode === 'ai-sdk' ? aiSdkAdapter : null;

  if (input.connectMode === 'chat-sdk') {
    if (!isChatSdkWiringReadyForTunnel(bridgeOutcome.requirements, projectDir, bridgeOutcome.scaffolded)) {
      return false;
    }
  } else if (adapter) {
    if (
      !isBridgeAdapterWiringReadyForTunnel(adapter, bridgeOutcome.requirements, projectDir, bridgeOutcome.scaffolded)
    ) {
      return false;
    }
  } else {
    return false;
  }

  const devCommand =
    input.connectMode === 'chat-sdk' ? buildChatSdkDevNovuScript(projectDir) : buildAiSdkDevNovuScript(projectDir);

  const choice = await promptBridgeTunnelInConsole({ projectDir, devCommand });
  if (choice === 'accept') {
    bridgeOutcome.tunnelAccepted = true;

    return true;
  }

  return false;
}
