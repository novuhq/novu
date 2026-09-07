import { ReactNode, useCallback, useState } from 'react';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { AiDrawer } from './ai-drawer';
import { AiDrawerContext } from './use-ai-drawer';

type AiDrawerProviderProps = {
  children: ReactNode;
};

export function AiDrawerProvider({ children }: AiDrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string>('');

  const openAiDrawer = useCallback((query?: string) => {
    if (!IS_AI_FEATURES_ENABLED) return;

    setInitialQuery(query || '');
    setIsOpen(true);
  }, []);

  const closeAiDrawer = useCallback(() => {
    setIsOpen(false);
    setInitialQuery('');
  }, []);

  return (
    <AiDrawerContext.Provider
      value={{
        isOpen,
        openAiDrawer,
        closeAiDrawer,
      }}
    >
      {children}
      {IS_AI_FEATURES_ENABLED && <AiDrawer isOpen={isOpen} onOpenChange={setIsOpen} initialQuery={initialQuery} />}
    </AiDrawerContext.Provider>
  );
}
