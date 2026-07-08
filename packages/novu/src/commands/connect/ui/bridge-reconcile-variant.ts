export type BridgeReconcileVariant = 'chat-sdk' | 'ai-sdk';

export function reconcilePlanTitle(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'AI SDK project setup';
  }

  return 'Chat SDK project setup';
}

export function installDepsPrompt(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'Install Novu framework?';
  }

  return 'Install Chat SDK packages?';
}

export function installingDepsMessage(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'Installing Novu framework…';
  }

  return 'Installing Chat SDK packages…';
}

export function requirementsFileEnvName(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'NOVU_CONNECT_AI_SDK_REQUIREMENTS_FILE';
  }

  return 'NOVU_CONNECT_CHAT_SDK_REQUIREMENTS_FILE';
}
