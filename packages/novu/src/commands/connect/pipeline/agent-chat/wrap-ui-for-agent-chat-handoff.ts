import type { ConnectUI } from '../../ui/ui';

export type AgentChatHandoffUiPolicy = {
  suppressBridgeScaffoldSummary: boolean;
  suppressBridgeReconcilePlan: boolean;
  suppressBridgeTunnel: boolean;
};

export function wrapUiForAgentChatHandoff(ui: ConnectUI, policy: AgentChatHandoffUiPolicy): ConnectUI {
  if (!policy.suppressBridgeScaffoldSummary && !policy.suppressBridgeReconcilePlan && !policy.suppressBridgeTunnel) {
    return ui;
  }

  return {
    ...ui,
    bridgeScaffolded: policy.suppressBridgeScaffoldSummary ? () => {} : ui.bridgeScaffolded.bind(ui),
    showBridgeReconcilePlan: policy.suppressBridgeReconcilePlan ? async () => {} : ui.showBridgeReconcilePlan.bind(ui),
    offerBridgeTunnel: policy.suppressBridgeTunnel ? async () => 'decline' as const : ui.offerBridgeTunnel.bind(ui),
  };
}

export function resolveAgentChatHandoffUiPolicy(input: {
  channel: string;
  agentChatHandoff: boolean;
  agentChatSetup?: string;
}): AgentChatHandoffUiPolicy | null {
  if (!input.agentChatHandoff) {
    return null;
  }

  const setup = input.agentChatSetup?.trim().toLowerCase();
  const skipCombinedScaffoldSummary = input.channel === 'agent-chat' && setup !== 'embed' && setup !== 'skip';

  return {
    suppressBridgeScaffoldSummary: skipCombinedScaffoldSummary,
    suppressBridgeReconcilePlan: true,
    suppressBridgeTunnel: true,
  };
}
