export type BridgeReconcileVariant = 'chat-sdk' | 'ai-sdk' | 'langchain';

export function reconcilePlanTitle(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'AI SDK project setup';
  }

  if (variant === 'langchain') {
    return 'LangChain project setup';
  }

  return 'Chat SDK project setup';
}

export function installDepsPrompt(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'Install Novu framework?';
  }

  if (variant === 'langchain') {
    return 'Install Novu framework + LangChain?';
  }

  return 'Install Chat SDK packages?';
}

export function installingDepsMessage(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'Installing Novu framework…';
  }

  if (variant === 'langchain') {
    return 'Installing Novu framework + LangChain…';
  }

  return 'Installing Chat SDK packages…';
}

export function requirementsFileEnvName(variant: BridgeReconcileVariant): string {
  if (variant === 'ai-sdk') {
    return 'NOVU_CONNECT_AI_SDK_REQUIREMENTS_FILE';
  }

  if (variant === 'langchain') {
    return 'NOVU_CONNECT_LANGCHAIN_REQUIREMENTS_FILE';
  }

  return 'NOVU_CONNECT_CHAT_SDK_REQUIREMENTS_FILE';
}
