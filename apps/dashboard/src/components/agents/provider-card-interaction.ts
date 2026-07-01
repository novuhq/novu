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
     * Agent-details toggle: false = onboarding collapsed ("Connecting…"), true = open ("Connect").
     * When omitted (onboarding flow), falls back to channelSelectionCollapsed.
     */
    onboardingExpanded?: boolean;
    channelSelectionCollapsed?: boolean;
  }
): ProviderCardVisualState {
  const onboardingExpanded = params.onboardingExpanded ?? !(params.channelSelectionCollapsed ?? true);

  if (interaction === 'auto-provisioned-connectable') {
    const effectiveConnected = params.isConnected;

    const inProgress = !onboardingExpanded && !effectiveConnected && (params.isSelected || params.isLoading);

    return {
      effectiveConnected,
      showSelectedIndicator: !onboardingExpanded && (params.isSelected || effectiveConnected),
      showConnecting: inProgress,
      isActive: params.isSelected || effectiveConnected,
    };
  }

  const effectiveConnected = params.isConnected;

  return {
    effectiveConnected,
    showSelectedIndicator: !onboardingExpanded && (params.isSelected || effectiveConnected),
    showConnecting: !onboardingExpanded && params.isSelected && !effectiveConnected,
    isActive: params.isSelected || effectiveConnected,
  };
}
