import type { ConnectUI } from '../../ui/ui';

export type WebChatHandoffUiPolicy = {
  suppressBridgeScaffoldSummary: boolean;
  suppressBridgeReconcilePlan: boolean;
  suppressBridgeTunnel: boolean;
};

export function wrapUiForWebChatHandoff(ui: ConnectUI, policy: WebChatHandoffUiPolicy): ConnectUI {
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

export function resolveWebChatHandoffUiPolicy(input: {
  channel: string;
  webChatHandoff: boolean;
  webChatSetup?: string;
}): WebChatHandoffUiPolicy | null {
  if (!input.webChatHandoff) {
    return null;
  }

  const setup = input.webChatSetup?.trim().toLowerCase();
  const skipCombinedScaffoldSummary = input.channel === 'web-chat' && setup !== 'embed' && setup !== 'skip';

  return {
    suppressBridgeScaffoldSummary: skipCombinedScaffoldSummary,
    suppressBridgeReconcilePlan: true,
    suppressBridgeTunnel: true,
  };
}
