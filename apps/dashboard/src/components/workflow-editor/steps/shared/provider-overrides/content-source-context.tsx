import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { type ContentSource, DEFAULT_CONTENT_SOURCE } from './content-source';

type ContentSourceContextValue = {
  selectedSource: ContentSource;
  setSelectedSource: (source: ContentSource) => void;
  previewSource: ContentSource;
  setPreviewSource: (source: ContentSource) => void;
};

const ContentSourceContext = createContext<ContentSourceContextValue | null>(null);

export const ContentSourceProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSource, setSelectedSourceState] = useState<ContentSource>(DEFAULT_CONTENT_SOURCE);
  const [previewSource, setPreviewSource] = useState<ContentSource>(DEFAULT_CONTENT_SOURCE);

  const setSelectedSource = useCallback((source: ContentSource) => {
    setSelectedSourceState(source);
    setPreviewSource(source);
  }, []);

  const value = useMemo(
    () => ({ selectedSource, setSelectedSource, previewSource, setPreviewSource }),
    [selectedSource, setSelectedSource, previewSource]
  );

  return <ContentSourceContext.Provider value={value}>{children}</ContentSourceContext.Provider>;
};

export const useContentSource = (): ContentSourceContextValue => {
  const context = useContext(ContentSourceContext);

  if (!context) {
    throw new Error('useContentSource must be used within a ContentSourceProvider');
  }

  return context;
};

/** Soft read for call sites that may render outside `ContentSourceProvider`. */
export const useOptionalContentSource = (): ContentSourceContextValue | null => {
  return useContext(ContentSourceContext);
};
