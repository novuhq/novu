import { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { WorkflowResponseDto, StepResponseDto, WorkflowOriginEnum } from '@novu/shared';
import { useEditorPreview } from '@/components/workflow-editor/steps/use-editor-preview';

type StepEditorContextType = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  controlValues: Record<string, unknown>;
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewData: any;
  isPreviewPending: boolean;
  isNovuCloud: boolean;
  isStepEditable: boolean;
  isStepPreviewable: boolean;
};

const StepEditorContext = createContext<StepEditorContextType | null>(null);

type StepEditorProviderProps = {
  children: ReactNode;
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
};

export function StepEditorProvider({ children, workflow, step }: StepEditorProviderProps) {
  const form = useFormContext();
  const controlValues = form.watch();

  const { editorValue, setEditorValue, previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues,
  });

  // Memoize expensive calculations that depend on step/workflow but don't change often
  const stepCapabilities = useMemo(() => {
    const { uiSchema } = step.controls;
    const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && Boolean(uiSchema);
    const isExternal = workflow.origin === WorkflowOriginEnum.EXTERNAL;
    const isStepEditable = isExternal || (isNovuCloud && Boolean(uiSchema));
    const isStepPreviewable = isNovuCloud;

    return {
      isNovuCloud,
      isStepEditable,
      isStepPreviewable,
    };
  }, [workflow.origin, step.controls.uiSchema]);

  // Memoize the stable setEditorValue function to prevent unnecessary re-renders
  const stableSetEditorValue = useCallback(
    (value: string) => {
      return setEditorValue(value);
    },
    [setEditorValue]
  );

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    (): StepEditorContextType => ({
      workflow,
      step,
      controlValues,
      editorValue,
      setEditorValue: stableSetEditorValue,
      previewData,
      isPreviewPending,
      ...stepCapabilities,
    }),
    [workflow, step, controlValues, editorValue, stableSetEditorValue, previewData, isPreviewPending, stepCapabilities]
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
