import { StepEditorLayout } from '@/components/workflow-editor/steps/step-editor-layout';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { PageMeta } from '@/components/page-meta';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { getControlsDefaultValues } from '@/utils/default-values';
import { flattenIssues, updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { SaveFormContext } from '@/components/workflow-editor/steps/save-form-context';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { StepUpdateDto } from '@novu/shared';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

export function EditStepTemplateV2Page() {
  const { workflow, update, step } = useWorkflow();

  const defaultValues = useMemo(() => (step ? getControlsDefaultValues(step) : {}), [step]);

  const form = useForm({
    defaultValues,
    values: step?.controls.values,
    shouldFocusError: false,
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const { onBlur, saveForm } = useFormAutosave({
    previousData: defaultValues,
    form,
    save: (data, { onSuccess }) => {
      if (!workflow || !step) return;

      const updateStepData: Partial<StepUpdateDto> = {
        controlValues: data,
      };
      update(updateStepInWorkflow(workflow, step.stepId, updateStepData), { onSuccess });
    },
  });

  // Run saveForm on unmount
  const saveFormRef = useDataRef(saveForm);
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      saveFormRef.current();
    };
  }, [saveFormRef]);

  const setIssuesFromStep = useCallback(() => {
    if (!step) return;

    const stepIssues = flattenIssues(step.issues?.controls);
    const currentErrors = form.formState.errors;

    // Clear errors that are not in stepIssues
    Object.keys(currentErrors).forEach((key) => {
      if (!stepIssues[key]) {
        form.clearErrors(key);
      }
    });

    // @ts-expect-error - isNew doesn't exist on StepResponseDto and it's too much work to override the @novu/shared types now. See useUpdateWorkflow.ts for more details
    if (!step.isNew) {
      Object.entries(stepIssues).forEach(([key, value]) => {
        form.setError(key as string, { message: value });
      });
    }
  }, [form, step]);

  useEffect(() => {
    setIssuesFromStep();
  }, [setIssuesFromStep]);

  const value = useMemo(() => ({ saveForm }), [saveForm]);

  if (!workflow || !step) {
    return null;
  }

  return (
    <>
      <PageMeta title={`Edit ${step.name} Template`} />
      <Form {...form}>
        <FormRoot className="flex h-full w-full flex-col" onBlur={onBlur}>
          <SaveFormContext.Provider value={value}>
            <StepEditorLayout workflow={workflow} step={step} />
          </SaveFormContext.Provider>
        </FormRoot>
      </Form>
    </>
  );
}
