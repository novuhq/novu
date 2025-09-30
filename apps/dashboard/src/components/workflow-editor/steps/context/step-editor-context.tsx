import {
  DEFAULT_LOCALE,
  GeneratePreviewResponseDto,
  ResourceOriginEnum,
  StepResponseDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useEditorPreview } from '@/components/workflow-editor/steps/use-editor-preview';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';

type StepEditorContextType = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  controlValues: Record<string, unknown>;
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewData: GeneratePreviewResponseDto | null;
  isPreviewPending: boolean;
  isInitialLoad: boolean;
  isSubsequentLoad: boolean;
  isNovuCloud: boolean;
  isStepEditable: boolean;
  selectedLocale: string;
  setSelectedLocale: (locale: string) => void;
};

export const StepEditorContext = createContext<StepEditorContextType | null>(null);

type StepEditorProviderProps = {
  children: ReactNode;
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
};

export function StepEditorProvider({ children, workflow, step }: StepEditorProviderProps) {
  const form = useFormContext();
  const controlValues = form.watch();
  const { data: organizationSettings, isLoading: isOrgSettingsLoading } = useFetchOrganizationSettings();

  // Only initialize selectedLocale when organization settings are loaded
  const organizationDefaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;
  const [selectedLocale, setSelectedLocale] = useState<string>(organizationDefaultLocale);

  // Update locale when organization settings first load
  useEffect(() => {
    if (!isOrgSettingsLoading && organizationSettings?.data?.defaultLocale) {
      setSelectedLocale(organizationSettings.data.defaultLocale);
    }
  }, [isOrgSettingsLoading, organizationSettings?.data?.defaultLocale]);

  const { editorValue, setEditorValue, previewData, isPreviewPending, isFetching } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues,
    payloadSchema: workflow.payloadSchema,
  });
  const { uiSchema } = step.controls;
  const isNovuCloud = workflow.origin === ResourceOriginEnum.NOVU_CLOUD && Boolean(uiSchema);
  const isExternal = workflow.origin === ResourceOriginEnum.EXTERNAL;
  const isStepEditable = isExternal || (isNovuCloud && Boolean(uiSchema));

  const isInitialLoad = isPreviewPending;
  const isSubsequentLoad = isFetching && !isPreviewPending;

  const contextValue = useMemo(
    () => ({
      workflow,
      step,
      controlValues,
      editorValue,
      setEditorValue,
      previewData: previewData || null,
      isPreviewPending,
      isInitialLoad,
      isSubsequentLoad,
      isNovuCloud,
      isStepEditable,
      selectedLocale,
      setSelectedLocale,
    }),
    [
      workflow,
      step,
      controlValues,
      editorValue,
      setEditorValue,
      previewData,
      isPreviewPending,
      isInitialLoad,
      isSubsequentLoad,
      isNovuCloud,
      isStepEditable,
      selectedLocale,
      setSelectedLocale,
    ]
  );

  return <StepEditorContext.Provider value={contextValue}>{children}</StepEditorContext.Provider>;
}

export function useStepEditor(): StepEditorContextType {
  const context = useContext(StepEditorContext);

  if (!context) {
    throw new Error('useStepEditor must be used within a StepEditorProvider');
  }

  return context;
}
