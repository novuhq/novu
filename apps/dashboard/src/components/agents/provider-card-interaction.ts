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

    // Email is auto-provisioned, so its link exists before the user does anything — that alone
    // must not read as "Connected" (that still requires a real inbound message via `isConnected`).
    // Once the user opens the setup guide (selects the card), or a link mutation is mid-flight, and
    // before that first message lands, surface the in-progress "Connecting…" state so the first-row
    // card mirrors the open onboarding guide below it instead of snapping back to "Connect". This
    // matches how standard channels present a selected-but-not-yet-connected provider.
    const inProgress = !effectiveConnected && (params.isSelected || params.isLoading);

    return {
      effectiveConnected,
      showSelectedIndicator: params.isSelected || effectiveConnected,
      showConnecting: inProgress,
      isActive: params.isSelected || effectiveConnected,
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
