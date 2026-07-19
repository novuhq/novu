import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { DEFAULT_CONTENT_SOURCE, type ToolContentSource } from './tool-content-source';

type ToolContentSourceContextValue = {
  selectedSource: ToolContentSource;
  setSelectedSource: (source: ToolContentSource) => void;
};

const ToolContentSourceContext = createContext<ToolContentSourceContextValue | null>(null);

export const ToolContentSourceProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSource, setSelectedSource] = useState<ToolContentSource>(DEFAULT_CONTENT_SOURCE);
  const value = useMemo(() => ({ selectedSource, setSelectedSource }), [selectedSource]);

  return <ToolContentSourceContext.Provider value={value}>{children}</ToolContentSourceContext.Provider>;
};

export const useToolContentSource = (): ToolContentSourceContextValue => {
  const context = useContext(ToolContentSourceContext);

  if (!context) {
    throw new Error('useToolContentSource must be used within a ToolContentSourceProvider');
  }

  return context;
};

export const useToolContentSourceOptional = (): ToolContentSourceContextValue | null => {
  return useContext(ToolContentSourceContext);
};
