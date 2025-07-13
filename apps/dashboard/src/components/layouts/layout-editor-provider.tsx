import { createContext, useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, UseFormReturn, useWatch } from 'react-hook-form';
import { GeneratePreviewResponseDto, LayoutResponseDto, ResourceOriginEnum } from '@novu/shared';

import { useFetchLayout } from '@/hooks/use-fetch-layout';
import { createContextHook } from '@/utils/context';
import { parse } from '@/utils/json';
import { useLayoutEditorPreview } from '@/hooks/use-layout-editor-preview';
import { getControlsDefaultValues } from '@/utils/default-values';

export type LayoutContextType = {
  layout?: LayoutResponseDto;
  isPending: boolean;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
  previewContextValue: string;
  isLayoutEditable: boolean;
  setPreviewContextValue: (value: string) => Error | null;
  form: UseFormReturn<Record<string, unknown>, any, undefined>;
};

export const LayoutEditorContext = createContext<LayoutContextType>({} as LayoutContextType);

export const LayoutEditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [previewContextValue, setPreviewContextValue] = useState('{}');
  const { layoutSlug = '' } = useParams<{
    layoutSlug?: string;
  }>();

  const { layout, isPending } = useFetchLayout({ layoutSlug });

  const defaultValues = useMemo(() => (layout ? getControlsDefaultValues(layout) : {}), [layout]);
  const values = useMemo(() => (layout?.controls.values.email ?? {}) as Record<string, unknown>, [layout]);

  const form = useForm({
    defaultValues,
    values,
    shouldFocusError: false,
    resetOptions: {
      keepDirtyValues: true,
    },
  });
  const controlValues = useWatch({ control: form.control });

  const { previewData, isPending: isPreviewPending } = useLayoutEditorPreview({
    layoutSlug,
    controlValues: { email: { ...controlValues } },
    previewContextValue,
  });

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
      previewData,
      isPreviewPending,
      previewContextValue,
      isLayoutEditable,
      setPreviewContextValue: setPreviewContextValueSafe,
      form,
    }),
    [
      layout,
      isPending,
      previewData,
      isPreviewPending,
      previewContextValue,
      setPreviewContextValueSafe,
      isLayoutEditable,
      form,
    ]
  );

  return <LayoutEditorContext.Provider value={value}>{children}</LayoutEditorContext.Provider>;
};

export const useLayoutEditor = createContextHook(LayoutEditorContext);
