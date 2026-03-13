import { StepUpdateDto } from '@novu/shared';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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

  const form = useForm({
    defaultValues: {},
    shouldFocusError: false,
  });

  // Initialize the form exactly once when step data first becomes available.
  // We deliberately avoid the `values` prop on useForm because it calls form.reset()
  // on every render where `values` has a new reference — which regenerates all
  // useFieldArray field IDs and causes visible row flicker on every save round-trip.
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (hasInitializedRef.current || !step) return;
    hasInitializedRef.current = true;
    form.reset(getControlsDefaultValues(step), { keepErrors: true });
  }, [form, step]);

  const { onBlur, saveForm, saveFormDebounced } = useFormAutosave({
    previousData: {},
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.clearErrors(key as any);
      }
    });

    // @ts-expect-error - isNew doesn't exist on StepResponseDto and it's too much work to override the @novu/shared types now. See useUpdateWorkflow.ts for more details
    if (!step.isNew) {
      Object.entries(stepIssues).forEach(([key, value]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.setError(key as any, { message: value });
      });
    }
  }, [form, step]);

  useEffect(() => {
    setIssuesFromStep();
  }, [setIssuesFromStep]);

  const value = useMemo(() => ({ saveForm, saveFormDebounced }), [saveForm, saveFormDebounced]);

  if (!workflow || !step) {
    return null;
  }

  // Wait for the one-time initialization effect to fire before rendering the editor.
  // Without this guard the form still has defaultValues: {} and the editor would
  // render with empty fields for one tick before the reset populates them.
  if (!hasInitializedRef.current) {
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
