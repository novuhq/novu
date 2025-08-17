import { createContext, useContext } from 'react';

type AiDrawerContextType = {
  isOpen: boolean;
  openAiDrawer: (query?: string) => void;
  closeAiDrawer: () => void;
};

export const AiDrawerContext = createContext<AiDrawerContextType | null>(null);

export function useAiDrawer() {
  const context = useContext(AiDrawerContext);
  if (!context) {
    throw new Error('useAiDrawer must be used within an AiDrawerProvider');
  }
  return context;
}
