import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useBlocker, useLocation } from 'react-router-dom';
import { useForm, UseFormReturn } from 'react-hook-form';
import { ExternalToast } from 'sonner';
import { GeneratePreviewResponseDto, LayoutResponseDto, ResourceOriginEnum, RuntimeIssue } from '@novu/shared';

import { useFetchLayout } from '@/hooks/use-fetch-layout';
import { createContextHook } from '@/utils/context';
import { parse, stringify } from '@/utils/json';
import { useLayoutPreview } from '@/hooks/use-layout-preview';
import { getLayoutControlsDefaultValues } from '@/utils/default-values';
import { useDebounce } from '@/hooks/use-debounce';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { UnsavedChangesAlertDialog } from '../unsaved-changes-alert-dialog';
import { UpdateLayoutParameters, useUpdateLayout } from '@/hooks/use-update-layout';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { NovuApiError } from '@/api/api.client';
import { flattenIssues, getFirstErrorMessage } from '../workflow-editor/step-utils';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0 pointer-events-none',
  },
};

export type LayoutContextType = {
  layout?: LayoutResponseDto;
  isPending: boolean;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
  previewContextValue: string;
  isLayoutEditable: boolean;
  isUpdating: boolean;
  updateLayout: (data: UpdateLayoutParameters) => Promise<LayoutResponseDto>;
  setPreviewContextValue: (value: string) => Error | null;
  form: UseFormReturn<Record<string, unknown>, any, undefined>;
};

export const LayoutEditorContext = createContext<LayoutContextType>({} as LayoutContextType);

export const LayoutEditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [previewContextValue, setPreviewContextValue] = useState('{}');
  const { layoutSlug = '' } = useParams<{
    layoutSlug?: string;
  }>();
  const location = useLocation();

  const { layout, isPending } = useFetchLayout({ layoutSlug });

  const defaultValues = useMemo(() => (layout ? getLayoutControlsDefaultValues(layout) : {}), [layout]);
  const values = useMemo(() => (layout?.controls.values.email ?? {}) as Record<string, unknown>, [layout]);

  const form = useForm({
    defaultValues,
    values,
    shouldFocusError: false,
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const hasUnsavedChanges = form.formState.isDirty;

  useBeforeUnload(hasUnsavedChanges);

  const blocker = useBlocker(({ nextLocation }) => {
    if (!hasUnsavedChanges) return false;

    return !nextLocation.pathname.startsWith(location.pathname);
  });

  const { previewData, isPending: isPreviewPending, preview } = useLayoutPreview();

  const debouncedPreview = useDebounce((controlValues: Record<string, unknown>) => {
    preview({
      layoutSlug,
      controlValues: { email: { ...controlValues } },
      previewContextValue,
    });
  }, 500);

  const setFormIssues = useCallback(
    (controlIssues?: Record<string, RuntimeIssue[]>) => {
      const flattenedIssues = flattenIssues(controlIssues);
      const layoutIssues = Object.keys(flattenedIssues).reduce(
        (acc, key) => {
          acc[key.replace('email.', '')] = flattenedIssues[key];
          return acc;
        },
        {} as Record<string, string>
      );

      const currentErrors = form.formState.errors;
      Object.keys(currentErrors).forEach((key) => {
        if (!layoutIssues[key]) {
          form.clearErrors(key);
        }
      });

      Object.entries(layoutIssues).forEach(([key, value]) => {
        form.setError(key as string, { message: value });
      });
    },
    [form]
  );

  const { updateLayout, isPending: isUpdating } = useUpdateLayout({
    onSuccess: () => {
      showSuccessToast('Layout updated successfully', '', toastOptions);
    },
    onError: (error) => {
      if (error instanceof NovuApiError && 'controls' in (error.rawError as any)) {
        const controlIssues = (error.rawError as any).controls;
        setFormIssues(controlIssues);

        const firstControlError = getFirstErrorMessage({ controls: controlIssues }, 'controls');
        showErrorToast(
          firstControlError?.message ?? 'Failed to update layout',
          'Failed to update layout',
          toastOptions
        );
        return;
      }

      showErrorToast(
        `Failed to update layout: ${(error as Error).message.toLowerCase()}`,
        (error as Error).message,
        toastOptions
      );
    },
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
      isUpdating,
      updateLayout,
      setPreviewContextValue: setPreviewContextValueSafe,
      form,
    }),
    [
      layout,
      isPending,
      previewData,
      isPreviewPending,
      previewContextValue,
      isUpdating,
      updateLayout,
      setPreviewContextValueSafe,
      isLayoutEditable,
      form,
    ]
  );

  useEffect(() => {
    const formValues = form.getValues();
    debouncedPreview(formValues);

    const subscription = form.watch((values) => {
      debouncedPreview(values);
    });

    return () => subscription.unsubscribe();
  }, [form, debouncedPreview]);

  useEffect(() => {
    const serverPayloadExample = previewData?.previewPayloadExample;
    if (!serverPayloadExample) return;

    setPreviewContextValue(stringify(serverPayloadExample));
  }, [previewData?.previewPayloadExample]);

  const handleBlockerProceed = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed?.();
    }
  }, [blocker]);

  const handleBlockerReset = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
  }, [blocker]);

  return (
    <>
      <LayoutEditorContext.Provider value={value}>{children}</LayoutEditorContext.Provider>
      <UnsavedChangesAlertDialog
        show={blocker.state === 'blocked'}
        description="You have unsaved changes in the layout editor. These changes will be lost if you leave this page."
        onCancel={handleBlockerReset}
        onProceed={handleBlockerProceed}
      />
    </>
  );
};

export const useLayoutEditor = createContextHook(LayoutEditorContext);
