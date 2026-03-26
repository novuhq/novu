import { ContentIssueEnum, StepUpdateDto } from '@novu/shared';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { PageMeta } from '@/components/page-meta';
import { Form } from '@/components/primitives/form/form';
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

  // Avoid the `values` prop on useForm: a new object reference each render triggers
  // form.reset() constantly and regenerates useFieldArray field IDs (visible flicker).
  // Instead reset when the step identity or server-sourced controls actually change
  // (navigation, resolver hash, autosave response, or refetch e.g. Copilot).
  const hasInitializedRef = useRef(false);
  const prevStepIdRef = useRef<string | undefined>(undefined);
  const prevHashRef = useRef<string | undefined>(undefined);
  const prevControlsFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (!step) return;

    const fingerprint = JSON.stringify({
      v: step.controls?.values,
      ui: step.controls?.uiSchema,
      ds: step.controls?.dataSchema,
    });

    const isFirstBind = prevStepIdRef.current === undefined;
    const stepIdChanged = !isFirstBind && prevStepIdRef.current !== step.stepId;
    const hashChanged = step.stepResolverHash !== prevHashRef.current;
    const controlsChanged =
      prevControlsFingerprintRef.current !== null && fingerprint !== prevControlsFingerprintRef.current;

    if (isFirstBind || stepIdChanged || hashChanged || controlsChanged) {
      prevStepIdRef.current = step.stepId;
      prevHashRef.current = step.stepResolverHash;
      prevControlsFingerprintRef.current = fingerprint;
      hasInitializedRef.current = true;
      form.reset(getControlsDefaultValues(step), { keepErrors: true });
    }
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

    // @ts-expect-error - isNew is set by useUpdateWorkflow, see that file for details
    if (step.isNew) {
      form.clearErrors();
      return;
    }

    const issues = flattenIssues(step.issues?.controls);
    const rawControlIssues = step.issues?.controls ?? {};
    const values = form.getValues() as Record<string, unknown>;
    const setError = form.setError as (key: string, error: { message: string }) => void;
    const clearError = form.clearErrors as (key: string) => void;

    for (const key of new Set([...Object.keys(form.formState.errors), ...Object.keys(issues)])) {
      const hasValue = values[key] != null && values[key] !== '';
      const keyIssues = rawControlIssues[key] ?? [];
      const isMissingValueOnly =
        keyIssues.length > 0 && keyIssues.every((i) => i.issueType === ContentIssueEnum.MISSING_VALUE);

      if (issues[key] && (!hasValue || !isMissingValueOnly)) {
        setError(key, { message: issues[key] });
      } else {
        clearError(key);
      }
    }
  }, [form, step]);

  useEffect(() => {
    setIssuesFromStep();
  }, [setIssuesFromStep]);

  const value = useMemo(() => ({ saveForm, saveFormDebounced, onBlur }), [saveForm, saveFormDebounced, onBlur]);

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
        <div className="flex h-full w-full flex-col">
          <SaveFormContext.Provider value={value}>
            <StepEditorLayout workflow={workflow} step={step} />
          </SaveFormContext.Provider>
        </div>
      </Form>
    </>
  );
}
