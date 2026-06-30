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
  if (interaction === 'auto-provisioned-connectable') {
    const effectiveConnected = params.isConnected;

    return {
      effectiveConnected,
      showSelectedIndicator: effectiveConnected ? params.isSelected || effectiveConnected : params.isLoading,
      showConnecting: effectiveConnected ? false : params.isLoading,
      isActive: effectiveConnected ? params.isSelected || effectiveConnected : params.isSelected,
    };
  }

  const effectiveConnected = params.isConnected;

  return {
    effectiveConnected,
    showSelectedIndicator: params.isSelected || effectiveConnected,
    showConnecting: params.isSelected && !effectiveConnected,
    isActive: params.isSelected || effectiveConnected,
  };
}
