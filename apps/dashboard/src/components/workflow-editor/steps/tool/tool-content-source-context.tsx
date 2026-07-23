import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_CONTENT_SOURCE, type ToolContentSource } from './tool-content-source';

type ToolContentSourceContextValue = {
  selectedSource: ToolContentSource;
  setSelectedSource: (source: ToolContentSource) => void;
  previewSource: ToolContentSource;
  setPreviewSource: (source: ToolContentSource) => void;
};

const ToolContentSourceContext = createContext<ToolContentSourceContextValue | null>(null);

export const ToolContentSourceProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSource, setSelectedSourceState] = useState<ToolContentSource>(DEFAULT_CONTENT_SOURCE);
  const [previewSource, setPreviewSource] = useState<ToolContentSource>(DEFAULT_CONTENT_SOURCE);

  const setSelectedSource = useCallback((source: ToolContentSource) => {
    setSelectedSourceState(source);
    setPreviewSource(source);
  }, []);

  const value = useMemo(
    () => ({ selectedSource, setSelectedSource, previewSource, setPreviewSource }),
    [selectedSource, setSelectedSource, previewSource]
  );

  return <ToolContentSourceContext.Provider value={value}>{children}</ToolContentSourceContext.Provider>;
};

export const useToolContentSource = (): ToolContentSourceContextValue => {
  const context = useContext(ToolContentSourceContext);

  if (!context) {
    throw new Error('useToolContentSource must be used within a ToolContentSourceProvider');
  }

  return context;
};
