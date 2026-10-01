import { createContext, useContext } from 'react';
import type { ConditionsEditorContextType } from './types';

export const ConditionsEditorContext = createContext<ConditionsEditorContextType | null>(null);

export const useConditionsEditorContext = () => {
  const context = useContext(ConditionsEditorContext);

  if (!context) {
    throw new Error('useConditionsEditorContext must be used within ConditionsEditorProvider');
  }

  return context;
};
