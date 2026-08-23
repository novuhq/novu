import type {
  AgentConnectMode,
  AiSdkConnectOutcome,
  ChatSdkConnectOutcome,
  CustomCodeConnectOutcome,
  LangChainConnectOutcome,
} from '../../types';
import { detectAgentChatUiWiring } from './detect-agent-chat-ui';
import { hasAgentChatEnvConfigured } from './wire-agent-chat-env';

export type BridgeSetupSnapshot =
  | AiSdkConnectOutcome
  | LangChainConnectOutcome
  | ChatSdkConnectOutcome
  | CustomCodeConnectOutcome;

export type AgentChatProjectWiringState = 'unwired' | 'partial' | 'wired';

const MANAGED_RUNTIMES = new Set<AgentConnectMode>(['demo', 'claude', 'claude-aws']);

export function resolveHandlerWired(bridgeOutcome?: BridgeSetupSnapshot): boolean {
  if (!bridgeOutcome) {
    return false;
  }

  if ('requirements' in bridgeOutcome && bridgeOutcome.requirements) {
    const wiring = bridgeOutcome.requirements.find((req) => req.id === 'code-wiring');
    if (wiring) {
      return wiring.status === 'ok';
    }
  }

  if ('agentFilePath' in bridgeOutcome && bridgeOutcome.agentFilePath) {
    return true;
  }

  return false;
}

export function resolveAgentChatProjectWiringState(
  projectDir: string,
  connectMode: AgentConnectMode,
  bridgeOutcome?: BridgeSetupSnapshot
): AgentChatProjectWiringState {
  const uiWired = detectAgentChatUiWiring(projectDir).isWired;
  const envReady = hasAgentChatEnvConfigured(projectDir);

  if (MANAGED_RUNTIMES.has(connectMode)) {
    if (uiWired && envReady) {
      return 'wired';
    }

    if (uiWired || envReady) {
      return 'partial';
    }

    return 'unwired';
  }

  const handlerWired = resolveHandlerWired(bridgeOutcome);

  if (handlerWired && uiWired && envReady) {
    return 'wired';
  }

  if (handlerWired || uiWired || envReady) {
    return 'partial';
  }

  return 'unwired';
}
