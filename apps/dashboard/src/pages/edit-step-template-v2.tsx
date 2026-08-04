import { ContentIssueEnum, StepResponseDto, StepUpdateDto, WorkflowResponseDto } from '@novu/shared';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { PageMeta } from '@/components/page-meta';
import { Form } from '@/components/primitives/form/form';
import { flattenIssues, updateStepInWorkflow } from '@/components/workflow-editor/step-utils';
import { SaveFormContext } from '@/components/workflow-editor/steps/save-form-context';
import { StepEditorLayout } from '@/components/workflow-editor/steps/step-editor-layout';
import { UpdateWorkflowFn, useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { getControlsDefaultValues } from '@/utils/default-values';

// Keyed by step.stepId so each step gets its own useForm() instance, constructed
// already-loaded with that step's saved values — no shared form state to keep in
// sync across a step switch.
export function EditStepTemplateV2Page() {
  const { workflow, update, step } = useWorkflow();

  if (!workflow || !step) {
    return null;
  }

  return <StepTemplateForm key={step.stepId} workflow={workflow} step={step} update={update} />;
}

function fingerprintControls(step: StepResponseDto): string {
  return JSON.stringify({
    v: step.controls?.values,
    po: step.providerOverrides,
    ui: step.controls?.uiSchema,
    ds: step.controls?.dataSchema,
  });
}

type StepTemplateFormProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  update: UpdateWorkflowFn;
};

function StepTemplateForm({ workflow, step, update }: StepTemplateFormProps) {
  const form = useForm({
    defaultValues: getControlsDefaultValues(step),
    shouldFocusError: false,
  });

  // Reactive resets for server-sourced changes while this step stays mounted (resolver
  // hash flip, Copilot edit, autosave echo). Step-identity changes are a remount
  // (see `key` at the call site above), not handled here.
  const prevHashRef = useRef(step.stepResolverHash);
  const prevControlsFingerprintRef = useRef(fingerprintControls(step));
  // Tracks ALL in-flight save fingerprints so that any server response that echoes back
  // one of our own saves is recognized and does not reset the form. A single ref would
  // be overwritten by rapid successive saves, causing the guard to fail for earlier
  // in-flight requests.
  const inFlightFingerprintsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fingerprint = fingerprintControls(step);
    const hashChanged = step.stepResolverHash !== prevHashRef.current;
    const controlsChanged = fingerprint !== prevControlsFingerprintRef.current;

    // If there are any in-flight saves, any server-side change we receive is the result
    // of our own edits. Skip the reset so we don't overwrite edits the user made while
    // requests were in-flight. The invocationQueue may apply pending requests on top, so
    // the server response FP may not exactly match any single in-flight FP — checking
    // the count is safer.
    const hasInFlightSaves = inFlightFingerprintsRef.current.size > 0;
    const isOwnSaveEcho = controlsChanged && (inFlightFingerprintsRef.current.has(fingerprint) || hasInFlightSaves);

    if (inFlightFingerprintsRef.current.has(fingerprint)) {
      inFlightFingerprintsRef.current.delete(fingerprint);
    }

    prevHashRef.current = step.stepResolverHash;
    prevControlsFingerprintRef.current = fingerprint;

    if (hashChanged || (controlsChanged && !isOwnSaveEcho)) {
      form.reset(getControlsDefaultValues(step), { keepErrors: true });
    }
  }, [form, step]);

  const { onBlur, saveForm, saveFormDebounced } = useFormAutosave({
    previousData: {},
    form,
    save: (data, { onSuccess }) => {
      const { providerOverrides, ...controlValues } = data as Record<string, unknown> & {
        providerOverrides?: StepUpdateDto['providerOverrides'];
      };
      const fp = JSON.stringify({
        v: controlValues,
        po: providerOverrides,
        ui: step.controls?.uiSchema,
        ds: step.controls?.dataSchema,
      });

      // Add to in-flight set before the request goes out. The fingerprint effect will
      // recognize any server response that matches this value and skip the form.reset()
      // that would otherwise overwrite in-progress edits.
      inFlightFingerprintsRef.current.add(fp);

      const updateStepData: Partial<StepUpdateDto> = { controlValues };
      // Omit when untouched (leave server docs unchanged); send null only to delete all.
      if (providerOverrides !== undefined) {
        updateStepData.providerOverrides = providerOverrides;
      }
      update(updateStepInWorkflow(workflow, step.stepId, updateStepData), {
        onSuccess: () => {
          // Clean up the in-flight fingerprint on success.
          inFlightFingerprintsRef.current.delete(fp);
          onSuccess?.();
        },
      });
    },
  });

  // Flush unsaved edits on unmount — fires on step switch (remount via key) and on
  // leaving the page.
  const saveFormRef = useDataRef(saveForm);
  useEffect(() => {
    return () => {
      saveFormRef.current();
    };
  }, [saveFormRef]);

  const setIssuesFromStep = useCallback(() => {
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
