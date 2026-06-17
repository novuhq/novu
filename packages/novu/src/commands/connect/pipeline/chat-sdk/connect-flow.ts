import type { ConnectApiClient } from '../../api/client';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type { AgentSummary, ChatSdkConnectOutcome, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { createBridgeAgentFlow, maybeRunChatSdkTunnel, runChatSdkProjectSetup } from './index';

export async function createChatSdkAgent(client: ConnectApiClient, ui: ConnectUI, options: ConnectCommandOptions) {
  return createBridgeAgentFlow(client, ui, options);
}

export async function finalizeChatSdkProjectSetup(input: {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  client: ConnectApiClient;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
}): Promise<ChatSdkConnectOutcome> {
  return runChatSdkProjectSetup(input);
}

export function shouldAutoRunChatSdkTunnel(outcome: ChatSdkConnectOutcome | undefined): boolean {
  if (!outcome) {
    return false;
  }

  if (outcome.skippedInstall) {
    return false;
  }

  return outcome.scaffolded === true;
}

export async function runChatSdkTunnelIfNeeded(outcome: ChatSdkConnectOutcome | undefined): Promise<void> {
  if (!shouldAutoRunChatSdkTunnel(outcome)) {
    return;
  }

  await maybeRunChatSdkTunnel({ outcome });
}
