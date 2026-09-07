/**
 * Unified per-card display state for the agent channel cards. `ProviderCard` consumes this directly
 * so it never has to branch on which mode it renders in: the pre-pick grid derives state from the
 * connect/connecting/connected flow, while a card inside the switcher rail derives it from its own
 * `switcherStatus` (independent of the current selection).
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
  isConnected: boolean;
  isSelected: boolean;
  /** Set only for cards inside the switcher rail; drives status independently of the selection. */
  switcherStatus?: ProviderSwitcherStatus;
}): ProviderCardDisplayState {
  const { isConnected, isSelected, switcherStatus } = params;

  if (switcherStatus !== undefined) {
    const effectiveConnected = switcherStatus === 'connected';
    const showInSetup = switcherStatus === 'in-setup';

    return {
      effectiveConnected,
      showCheck: effectiveConnected,
      showConnecting: false,
      showInSetup,
      showActiveBorder: isSelected,
      isActive: isSelected || effectiveConnected,
    };
  }

  return {
    effectiveConnected: isConnected,
    showCheck: isConnected,
    showConnecting: isSelected && !isConnected,
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
