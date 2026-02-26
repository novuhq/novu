import { StepUpdateDto } from '@novu/shared';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { PageMeta } from '@/components/page-meta';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { flattenIssues, updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { SaveFormContext } from '@/components/workflow-editor/steps/save-form-context';
import { StepEditorLayout } from '@/components/workflow-editor/steps/step-editor-layout';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { getControlsDefaultValues } from '@/utils/default-values';

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

      const { stepResolverHash: _stripped, ...controlValues } = data as Record<string, unknown> & {
        stepResolverHash?: unknown;
      };

      const updateStepData: Partial<StepUpdateDto> = {
        controlValues,
      };
      update(updateStepInWorkflow(workflow, step.stepId, updateStepData), { onSuccess });
    },
  });

  // Run saveForm on unmount
  const saveFormRef = useDataRef(saveForm);
  useEffect(() => {
    return () => {
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

  const formValues = form.getValues();
  const hasFormValues = Object.keys(formValues).length > 0;
  const stepControlValues = step.controls.values;
  const hasStepControlValues = stepControlValues && Object.keys(stepControlValues).length > 0;

  // Wait for form to sync with step values when step has values to sync
  // If stepControlValues is undefined, step hasn't loaded yet - don't render
  // If stepControlValues is defined but has values, wait for form to sync - don't render until hasFormValues is true
  // If stepControlValues is defined but empty {}, that's valid - render immediately
  if (stepControlValues === undefined) {
    return null;
  }

  if (hasStepControlValues && !hasFormValues) {
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
