import { createContext, useContext } from 'react';

type PreviewTriggerContextType = {
  triggerPreview: () => void;
};

const PreviewTriggerContext = createContext<PreviewTriggerContextType | null>(null);

export const PreviewTriggerProvider = PreviewTriggerContext.Provider;

export const usePreviewTrigger = () => {
  const context = useContext(PreviewTriggerContext);

  if (!context) {
    // Return a no-op function if context is not available
    return { triggerPreview: () => {} };
  }

  return context;
};
