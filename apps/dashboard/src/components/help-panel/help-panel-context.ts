import { createContext, useContext } from 'react';

export type HelpPanelOpenSource = 'header' | 'shortcut';

export type HelpPanelContextType = {
  isEnabled: boolean;
  isOpen: boolean;
  openHelpPanel: (source: HelpPanelOpenSource) => void;
  closeHelpPanel: () => void;
  registerAnchor: (element: HTMLElement | null) => (() => void) | undefined;
};

export const HelpPanelContext = createContext<HelpPanelContextType | null>(null);

export function useHelpPanel() {
  const context = useContext(HelpPanelContext);

  if (!context) {
    throw new Error('useHelpPanel must be used within a HelpPanelProvider');
  }

  return context;
}
