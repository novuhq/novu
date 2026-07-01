import { EmailProviderIdEnum } from '@novu/shared';

export type ProviderCardInteraction = 'standard' | 'auto-provisioned-connectable';

export type ProviderCardVisualState = {
  effectiveConnected: boolean;
  showSelectedIndicator: boolean;
  showConnecting: boolean;
  isActive: boolean;
};

export function getProviderCardInteraction(providerId: string): ProviderCardInteraction {
  if (providerId === EmailProviderIdEnum.NovuAgent) {
    return 'auto-provisioned-connectable';
  }

  return 'standard';
}

export function resolveProviderCardVisualState(
  interaction: ProviderCardInteraction,
  params: {
    isConnected: boolean;
    isSelected: boolean;
    isLoading: boolean;
  }
): ProviderCardVisualState {
  const effectiveConnected = params.isConnected;

  if (interaction === 'auto-provisioned-connectable') {
    const inProgress = !effectiveConnected && (params.isSelected || params.isLoading);

    return {
      effectiveConnected,
      showSelectedIndicator: params.isSelected || effectiveConnected,
      showConnecting: inProgress,
      isActive: params.isSelected || effectiveConnected,
    };
  }

  return {
    effectiveConnected,
    showSelectedIndicator: params.isSelected || effectiveConnected,
    showConnecting: params.isSelected && !effectiveConnected,
    isActive: params.isSelected || effectiveConnected,
  };
}

/**
 * Status shown on a channel card in the compact switcher rail (rendered on the agent details page
 * once a channel has been picked). Unlike the visual state above, this is independent of which
 * channel is currently selected, so every linked channel surfaces its own setup progress and the
 * user can freely switch between them.
 */
export type ProviderSwitcherStatus = 'connected' | 'in-setup' | 'connectable';

export function resolveProviderSwitcherStatus(params: {
  isConnected: boolean;
  isLinked: boolean;
}): ProviderSwitcherStatus {
  if (params.isConnected) {
    return 'connected';
  }

  if (params.isLinked) {
    return 'in-setup';
  }

  return 'connectable';
}
