/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */

import {
  ContentIssueEnum,
  ContextPayload,
  DEFAULT_LOCALE,
  EmailControlsDto,
  GeneratePreviewResponseDto,
  LayoutResponseDto,
  ResourceOriginEnum,
  RuntimeIssue,
  SubscriberDto,
} from '@novu/shared';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBlocker, useLocation } from 'react-router-dom';
import { ExternalToast } from 'sonner';
import { NovuApiError } from '@/api/api.client';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useDebounce } from '@/hooks/use-debounce';
import { useDefaultSubscriberData } from '@/hooks/use-default-subscriber-data';
import { useLayoutPreview } from '@/hooks/use-layout-preview';
import { usePreviewContext } from '@/hooks/use-preview-context';
import { UpdateLayoutParameters, useUpdateLayout } from '@/hooks/use-update-layout';
import { createContextHook } from '@/utils/context';
import { getLayoutControlsDefaultValues } from '@/utils/default-values';
import { parse } from '@/utils/json';
import { useFetchOrganizationSettings } from '../../hooks/use-fetch-organization-settings';
import { Form, FormRoot } from '../primitives/form/form';
import { UnsavedChangesAlertDialog } from '../unsaved-changes-alert-dialog';
import { flattenIssues, getFirstErrorMessage } from '../workflow-editor/step-utils';
import { usePersistedPreviewContext } from '../workflow-editor/steps/hooks/use-persisted-preview-context';

type ParsedData = { subscriber: Partial<SubscriberDto>; context: ContextPayload };

function parseJsonValue(value: string): ParsedData {
  try {
    const parsed = JSON.parse(value || '{}');
    return {
      subscriber: parsed.subscriber || {},
      context: parsed.context || {},
    };
  } catch {
    return {
      subscriber: {},
      context: {},
    };
  }
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function useLocaleSynchronization({
  selectedLocale,
  subscriberLocale,
  isOrgSettingsLoading,
  hasSubscriberData,
  updatePreviewSection,
  onLocaleChange,
  previewContext,
}: {
  selectedLocale?: string;
  subscriberLocale?: string;
  isOrgSettingsLoading: boolean;
  hasSubscriberData: boolean;
  updatePreviewSection: (section: 'subscriber', data: ParsedData['subscriber']) => void;
  onLocaleChange?: (locale: string) => void;
  previewContext: ParsedData;
}) {
  const prevSelectedLocale = usePrevious(selectedLocale);
  const prevSubscriberLocale = usePrevious(subscriberLocale);

  useEffect(() => {
    if (isOrgSettingsLoading || !selectedLocale || !hasSubscriberData) {
      return;
    }

    const selectedLocaleChanged = selectedLocale !== prevSelectedLocale;
    const subscriberLocaleChanged = subscriberLocale !== prevSubscriberLocale;

    if (selectedLocaleChanged && selectedLocale !== subscriberLocale) {
      updatePreviewSection('subscriber', {
        ...previewContext.subscriber,
        locale: selectedLocale,
      });
    } else if (subscriberLocaleChanged && subscriberLocale && subscriberLocale !== selectedLocale && onLocaleChange) {
      onLocaleChange(subscriberLocale);
    }
  }, [
    selectedLocale,
    subscriberLocale,
    prevSelectedLocale,
    prevSubscriberLocale,
    isOrgSettingsLoading,
    hasSubscriberData,
    updatePreviewSection,
    onLocaleChange,
    previewContext.subscriber,
  ]);
}

const toastOptions: ExternalToast = {
  duration: 5000,
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
  updatePreviewSection: ((section: 'subscriber', data: Partial<SubscriberDto>) => void) &
    ((section: 'context', data: ContextPayload) => void);
  issues: { controls: Record<string, RuntimeIssue[]> };
  selectedLocale: string;
  onLocaleChange: (locale: string) => void;
  accordionValue: string[];
  setAccordionValue: (value: string[]) => void;
  errors: { subscriber: string | null; context: string | null };
  previewContext: ParsedData;
  hasUnsavedChanges: boolean;
  clearPersistedSubscriber: () => void;
  clearPersistedContext: () => void;
};

export const LayoutEditorContext = createContext<LayoutContextType>({} as LayoutContextType);

export const LayoutEditorProvider = ({
  children,
  layout,
  layoutSlug,
  isPending,
}: {
  children: React.ReactNode;
  layout: LayoutResponseDto;
  layoutSlug: string;
  isPending: boolean;
}) => {
  const [previewContextValue, setPreviewContextValue] = useState('{}');
  const location = useLocation();
  const { data: organizationSettings, isLoading: isOrgSettingsLoading } = useFetchOrganizationSettings();
  const { currentEnvironment } = useEnvironment();
  const defaultValues = useMemo(() => (layout ? getLayoutControlsDefaultValues(layout) : {}), [layout]);
  const values = useMemo(() => (layout?.controls.values.email ?? {}) as Record<string, unknown>, [layout]);
  const [selectedLocale, setSelectedLocale] = useState<string>(
    organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE
  );

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

  const [layoutPreviewParams, setLayoutPreviewParams] = useState({
    layoutSlug,
    controlValues: form.getValues(),
    previewContextValue,
  });
  const { previewData, isPending: isPreviewPending } = useLayoutPreview(layoutPreviewParams);

  const debouncedPreview = useDebounce(
    (controlValues: Record<string, unknown>, slug: string, previewContext: string) => {
      setLayoutPreviewParams({
        layoutSlug: slug,
        controlValues: { email: { ...controlValues } },
        previewContextValue: previewContext,
      });
    },
    500
  );

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

  const onLocaleChange = useCallback((newLocale: string) => {
    setSelectedLocale(newLocale);
  }, []);

  const createDefaultSubscriberData = useDefaultSubscriberData(undefined, organizationSettings?.data?.defaultLocale);

  const {
    loadPersistedSubscriber,
    savePersistedSubscriber,
    clearPersistedSubscriber,
    loadPersistedContext,
    savePersistedContext,
    clearPersistedContext,
  } = usePersistedPreviewContext({
    workflowId: layout?._id || '',
    environmentId: currentEnvironment?._id || '',
  });

  const { accordionValue, setAccordionValue, errors, previewContext, updatePreviewSection } = usePreviewContext<
    ParsedData,
    { subscriber: string | null; context: string | null }
  >({
    value: previewContextValue,
    onChange: setPreviewContextValueSafe,
    defaultAccordionValue: ['subscriber', 'context'],
    defaultErrors: {
      subscriber: null,
      context: null,
    },
    parseJsonValue,
    onDataPersist: (data: ParsedData) => {
      if (data.subscriber !== undefined) {
        savePersistedSubscriber(data.subscriber);
      }

      if (data.context !== undefined) {
        savePersistedContext(data.context);
      }
    },
  });

  useLocaleSynchronization({
    selectedLocale,
    subscriberLocale: previewContext.subscriber?.locale,
    isOrgSettingsLoading,
    hasSubscriberData: Object.keys(previewContext.subscriber || {}).length > 0,
    updatePreviewSection,
    onLocaleChange,
    previewContext,
  });

  const issues = useMemo(
    () => ({
      controls: Object.entries(form.formState.errors).reduce(
        (acc, [key, value]) => {
          acc[key] = [{ message: value?.message ?? '', issueType: ContentIssueEnum.ILLEGAL_VARIABLE_IN_CONTROL_VALUE }];
          return acc;
        },
        {} as Record<string, RuntimeIssue[]>
      ),
    }),
    [form.formState.errors]
  );

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
      updatePreviewSection,
      issues,
      selectedLocale,
      onLocaleChange,
      accordionValue,
      setAccordionValue,
      errors,
      previewContext,
      hasUnsavedChanges,
      clearPersistedSubscriber,
      clearPersistedContext,
    }),
    [
      layout,
      isPending,
      previewData,
      isPreviewPending,
      previewContextValue,
      isUpdating,
      updateLayout,
      updatePreviewSection,
      accordionValue,
      setAccordionValue,
      isLayoutEditable,
      issues,
      selectedLocale,
      onLocaleChange,
      errors,
      previewContext,
      hasUnsavedChanges,
      clearPersistedSubscriber,
      clearPersistedContext,
    ]
  );

  useEffect(() => {
    const formValues = form.getValues();
    debouncedPreview(formValues, layoutSlug, previewContextValue);

    const subscription = form.watch((values) => {
      debouncedPreview(values, layoutSlug, previewContextValue);
    });

    return () => subscription.unsubscribe();
  }, [form, debouncedPreview, layoutSlug, previewContextValue]);

  useEffect(() => {
    if (
      !layout?._id ||
      !currentEnvironment?._id ||
      isOrgSettingsLoading ||
      !organizationSettings?.data?.defaultLocale
    ) {
      return;
    }

    const storedSubscriberData = loadPersistedSubscriber();
    const storedContextData = loadPersistedContext();

    const subscriberToUse =
      storedSubscriberData && Object.keys(storedSubscriberData).length > 0
        ? storedSubscriberData
        : createDefaultSubscriberData();

    const contextToUse = storedContextData && Object.keys(storedContextData).length > 0 ? storedContextData : {};

    const completePreviewContext = JSON.stringify(
      {
        subscriber: subscriberToUse,
        context: contextToUse,
      },
      null,
      2
    );

    setPreviewContextValueSafe(completePreviewContext);

    if (storedSubscriberData?.locale) {
      onLocaleChange(storedSubscriberData.locale);
    } else {
      onLocaleChange(organizationSettings.data.defaultLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    layout?._id,
    currentEnvironment?._id,
    isOrgSettingsLoading,
    organizationSettings?.data?.defaultLocale,
    loadPersistedSubscriber,
    loadPersistedContext,
    createDefaultSubscriberData,
    setPreviewContextValueSafe,
    onLocaleChange,
  ]);

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

  const onSubmit = (formData: Record<string, unknown>) => {
    updateLayout({
      layout: {
        name: layout?.name ?? '',
        isTranslationEnabled: layout?.isTranslationEnabled ?? false,
        controlValues: {
          email: {
            ...(formData as EmailControlsDto),
          },
        },
      },
      layoutSlug: layout?.slug ?? '',
    });
  };

  return (
    <>
      <LayoutEditorContext.Provider value={value}>
        <Form {...form}>
          <FormRoot
            id="edit-layout"
            autoComplete="off"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full w-full flex-col"
          >
            {children}
          </FormRoot>
        </Form>
      </LayoutEditorContext.Provider>
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
