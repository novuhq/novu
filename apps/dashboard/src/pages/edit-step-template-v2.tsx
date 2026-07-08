import { ContentIssueEnum, StepUpdateDto } from '@novu/shared';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const prevStepIdRef = useRef<string | undefined>(undefined);
  const prevHashRef = useRef<string | undefined>(undefined);
  const prevControlsFingerprintRef = useRef<string | null>(null);
  // Step whose control values are currently loaded into the form. Autosave is blocked
  // until this matches the active route step, preventing mid-transition blur saves.
  const formLoadedStepIdRef = useRef<string | undefined>(undefined);
  const [formLoadedStepId, setFormLoadedStepId] = useState<string | undefined>(undefined);
  // Tracks ALL in-flight save fingerprints so that any server response that
  // echoes back one of our own saves is recognized and does not reset the form.
  // A single ref would be overwritten by rapid successive saves, causing the
  // guard to fail for earlier in-flight requests.
  const inFlightFingerprintsRef = useRef<Set<string>>(new Set());

  const canSaveForm = useCallback(() => {
    return Boolean(step?.stepId && formLoadedStepIdRef.current === step.stepId);
  }, [step?.stepId]);

  const { onBlur, saveForm, saveFormDebounced, cancelPendingSaves } = useFormAutosave({
    previousData: {},
    form,
    canSave: canSaveForm,
    save: (data, { onSuccess }) => {
      const targetStepId = formLoadedStepIdRef.current;
      const targetStep = workflow?.steps.find((s) => s.stepId === targetStepId);
      if (!workflow || !targetStep || !targetStepId) return;

      const fp = JSON.stringify({
        v: data,
        ui: targetStep.controls?.uiSchema,
        ds: targetStep.controls?.dataSchema,
      });

      // Add to in-flight set before the request goes out. The fingerprint
      // effect will recognize any server response that matches this value and
      // skip the form.reset() that would otherwise overwrite in-progress edits.
      inFlightFingerprintsRef.current.add(fp);

      const updateStepData: Partial<StepUpdateDto> = {
        controlValues: data,
      };
      update(updateStepInWorkflow(workflow, targetStepId, updateStepData), {
        onSuccess: () => {
          // Clean up the in-flight fingerprint on success.
          inFlightFingerprintsRef.current.delete(fp);
          onSuccess?.();
        },
      });
    },
  });

  const cancelPendingSavesRef = useDataRef(cancelPendingSaves);

  useLayoutEffect(() => {
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

    // If there are any in-flight saves, any server-side change we receive is
    // the result of our own edits. Skip the reset so we don't overwrite edits
    // the user made while requests were in-flight. The invocationQueue may
    // apply pending requests on top, so the server response FP may not exactly
    // match any single in-flight FP — checking the count is safer.
    const hasInFlightSaves = inFlightFingerprintsRef.current.size > 0;
    const isOwnSaveEcho = controlsChanged && (inFlightFingerprintsRef.current.has(fingerprint) || hasInFlightSaves);

    if (inFlightFingerprintsRef.current.has(fingerprint)) {
      inFlightFingerprintsRef.current.delete(fingerprint);
    }

    const shouldReset = isFirstBind || stepIdChanged || hashChanged || (controlsChanged && !isOwnSaveEcho);

    if (stepIdChanged) {
      // Hide the editor and block autosave until the incoming step's values are loaded.
      formLoadedStepIdRef.current = undefined;
      setFormLoadedStepId(undefined);
      cancelPendingSavesRef.current();

      // Persist any unsaved edits on the step we're leaving before resetting the form.
      if (workflow && form.formState.isDirty) {
        const outgoingStepId = prevStepIdRef.current as string;
        const outgoingValues = form.getValues();
        update(updateStepInWorkflow(workflow, outgoingStepId, { controlValues: outgoingValues }));
      }
    }

    prevStepIdRef.current = step.stepId;
    prevHashRef.current = step.stepResolverHash;
    prevControlsFingerprintRef.current = fingerprint;

    if (shouldReset) {
      cancelPendingSavesRef.current();
      form.reset(getControlsDefaultValues(step), { keepErrors: true });
      formLoadedStepIdRef.current = step.stepId;
      setFormLoadedStepId(step.stepId);
    }
  }, [form, step, workflow, update, cancelPendingSavesRef]);

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

  // Do not mount field editors until the form has been reset to this step's values.
  // Mounting earlier lets blur/autosave persist a stale or empty snapshot.
  if (formLoadedStepId !== step.stepId) {
    return null;
  }

  return (
    <>
      <PageMeta title={`Edit ${step.name} Template`} />
      <Form {...form}>
        <div className="flex h-full w-full flex-col">
          <SaveFormContext.Provider value={value}>
            <StepEditorLayout key={step.stepId} workflow={workflow} step={step} />
          </SaveFormContext.Provider>
        </div>
      </Form>
    </>
  );
}
