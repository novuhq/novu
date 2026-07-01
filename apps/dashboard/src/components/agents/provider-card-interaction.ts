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
    /**
     * Agent-details channel-selection toggle: true = expanded "Connect" cards (plain state),
     * false = collapsed "Connecting…" card (surfaces the in-progress connecting/selected indicators).
     * Omitted in the onboarding flow, where it defaults to false so selected cards still read
     * "Connecting…" as before.
     */
    channelSelectionExpanded?: boolean;
  }
): ProviderCardVisualState {
  const channelSelectionExpanded = params.channelSelectionExpanded ?? false;

  if (interaction === 'auto-provisioned-connectable') {
    const effectiveConnected = params.isConnected;

    const inProgress = !channelSelectionExpanded && !effectiveConnected && (params.isSelected || params.isLoading);

    return {
      effectiveConnected,
      showSelectedIndicator: !channelSelectionExpanded && (params.isSelected || effectiveConnected),
      showConnecting: inProgress,
      isActive: params.isSelected || effectiveConnected,
    };
  }

  const effectiveConnected = params.isConnected;

  return {
    effectiveConnected,
    showSelectedIndicator: !channelSelectionExpanded && (params.isSelected || effectiveConnected),
    showConnecting: !channelSelectionExpanded && params.isSelected && !effectiveConnected,
    isActive: params.isSelected || effectiveConnected,
  };
}
