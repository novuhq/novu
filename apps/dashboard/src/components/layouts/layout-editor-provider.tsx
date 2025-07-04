import { createContext, useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutResponseDto, ResourceOriginEnum } from '@novu/shared';

import { useFetchLayout } from '@/hooks/use-fetch-layout';
import { createContextHook } from '@/utils/context';
import { parse } from '@/utils/json';

export type LayoutContextType = {
  layout?: LayoutResponseDto;
  isPending: boolean;
  isLayoutPreviewLoading: boolean;
  previewContextValue: string;
  isLayoutEditable: boolean;
  setPreviewContextValue: (value: string) => Error | null;
};

export const LayoutEditorContext = createContext<LayoutContextType>({} as LayoutContextType);

export const LayoutEditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [previewContextValue, setPreviewContextValue] = useState('{}');
  const { layoutSlug = '' } = useParams<{
    layoutSlug?: string;
  }>();
  const isLayoutPreviewLoading = false;

  const { layout, isPending } = useFetchLayout({ layoutSlug });
  const isNovuCloud = layout?.origin === ResourceOriginEnum.NOVU_CLOUD && Boolean(layout?.controls.uiSchema);
  const isExternal = layout?.origin === ResourceOriginEnum.EXTERNAL;
  const isLayoutEditable = isExternal || (isNovuCloud && Boolean(layout?.controls.uiSchema));

  const setPreviewContextValueSafe = useCallback((value: string): Error | null => {
    const { error } = parse(value);
    if (error) return error;

    setPreviewContextValue(value);
    return null;
  }, []);

  const value = useMemo(
    () => ({
      layout,
      isPending,
      isLayoutPreviewLoading,
      previewContextValue,
      isLayoutEditable,
      setPreviewContextValue: setPreviewContextValueSafe,
    }),
    [layout, isPending, isLayoutPreviewLoading, previewContextValue, setPreviewContextValueSafe, isLayoutEditable]
  );

  return <LayoutEditorContext.Provider value={value}>{children}</LayoutEditorContext.Provider>;
};

export const useLayoutEditor = createContextHook(LayoutEditorContext);
