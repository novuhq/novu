import { EmailProviderIdEnum } from '@novu/shared';

export type ProviderCardInteraction = 'standard' | 'auto-provisioned-connectable';

export function getProviderCardInteraction(providerId: string): ProviderCardInteraction {
  if (providerId === EmailProviderIdEnum.NovuAgent) {
    return 'auto-provisioned-connectable';
  }

  return 'standard';
}

/**
 * Unified per-card display state for the agent channel cards. `ProviderCard` consumes this directly
 * so it never has to branch on which mode it renders in: the pre-pick grid derives state from the
 * connect/connecting/connected interaction, while a card inside the switcher rail derives it from
 * its own `switcherStatus` (independent of the current selection).
 */
export type ProviderCardDisplayState = {
  effectiveConnected: boolean;
  showCheck: boolean;
  showConnecting: boolean;
  showInSetup: boolean;
  showActiveBorder: boolean;
  isActive: boolean;
};

export function resolveProviderCardDisplayState(params: {
  interaction: ProviderCardInteraction;
  isConnected: boolean;
  isSelected: boolean;
  isLoading: boolean;
  /** Set only for cards inside the switcher rail; drives status independently of the selection. */
  switcherStatus?: ProviderSwitcherStatus;
}): ProviderCardDisplayState {
  const { interaction, isConnected, isSelected, isLoading, switcherStatus } = params;

  if (switcherStatus !== undefined) {
    const effectiveConnected = switcherStatus === 'connected';

    return {
      effectiveConnected,
      showCheck: effectiveConnected,
      showConnecting: false,
      showInSetup: switcherStatus === 'in-setup',
      showActiveBorder: isSelected,
      isActive: isSelected || effectiveConnected,
    };
  }

  const showConnecting =
    interaction === 'auto-provisioned-connectable'
      ? !isConnected && (isSelected || isLoading)
      : isSelected && !isConnected;

  return {
    effectiveConnected: isConnected,
    showCheck: isSelected || isConnected,
    showConnecting,
    showInSetup: false,
    showActiveBorder: false,
    isActive: isSelected || isConnected,
  };
}

/**
 * Status shown on a channel card in the compact switcher rail (rendered on the agent details page
 * once a channel has been picked). Independent of which channel is currently selected, so every
 * linked channel surfaces its own setup progress and the user can freely switch between them.
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
