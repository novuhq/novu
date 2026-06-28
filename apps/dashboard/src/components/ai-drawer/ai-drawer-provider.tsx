import { ReactNode, useCallback, useState } from 'react';
import { IS_DOCS_ASSISTANT_ENABLED } from '@/config';
import { AiDrawer } from './ai-drawer';
import { AiDrawerContext } from './use-ai-drawer';

type AiDrawerProviderProps = {
  children: ReactNode;
};

export function AiDrawerProvider({ children }: AiDrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string>('');

  const openAiDrawer = useCallback((query?: string) => {
    if (!IS_DOCS_ASSISTANT_ENABLED) return;

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
      {IS_DOCS_ASSISTANT_ENABLED && <AiDrawer isOpen={isOpen} onOpenChange={setIsOpen} initialQuery={initialQuery} />}
    </AiDrawerContext.Provider>
  );
}
