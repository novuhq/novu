import { WorkflowResponseDto } from '@novu/shared';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { ReactNode, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLocalMode } from '@/context/local-mode';
import { findLocalStep, findLocalWorkflow } from '@/utils/local-bridge';
import { findDigestStepBeforeCurrent } from './step-utils';
import { WorkflowContext, WorkflowContextType } from './workflow-provider';
import { WorkflowSchemaProvider } from './workflow-schema-provider';

/**
 * Mounts the workflow editor on a *virtual* workflow — one that exists only in
 * the local bridge `discover` response, not in the database. Satisfies the
 * same `WorkflowContext` contract as `WorkflowProvider`, with persistence
 * turned into no-ops: virtual workflows are `origin: EXTERNAL`, so the editor
 * chrome is already read-only, and there is no entity to patch anyway.
 */
export const LocalWorkflowProvider = ({ children }: { children: ReactNode }) => {
  const { workflowSlug = '', stepSlug = '' } = useParams<{ workflowSlug?: string; stepSlug?: string }>();
  const { workflows, isDiscoverPending, refetchDiscover, controlOverrides, setStepControlOverrides } = useLocalMode();

  const baseWorkflow = useMemo(() => findLocalWorkflow(workflows, workflowSlug), [workflows, workflowSlug]);

  // Overlay sandbox-edited control values on top of the discovered ones, so
  // the editor form, previews, and test triggers all agree on what the user
  // sees after "override code defined defaults" edits.
  const workflow = useMemo(() => {
    if (!baseWorkflow) return undefined;

    const overrides = controlOverrides[baseWorkflow.workflowId];
    if (!overrides || Object.keys(overrides).length === 0) return baseWorkflow;

    return {
      ...baseWorkflow,
      steps: baseWorkflow.steps.map((candidate) => {
        const stepOverride = overrides[candidate.stepId];
        if (!stepOverride) return candidate;

        return {
          ...candidate,
          controls: { ...candidate.controls, values: stepOverride },
        };
      }),
    };
  }, [baseWorkflow, controlOverrides]);

  const step = useMemo(() => findLocalStep(workflow, stepSlug), [workflow, stepSlug]);

  const digestStepBeforeCurrent = useMemo(
    () => findDigestStepBeforeCurrent(workflow?.steps, step),
    [workflow?.steps, step]
  );

  const refetch = useCallback(
    async (_options?: RefetchOptions) => {
      await refetchDiscover();

      return { data: workflow } as QueryObserverResult<WorkflowResponseDto, Error>;
    },
    [refetchDiscover, workflow]
  );

  // Nothing to persist for virtual workflows — but "update" carries the
  // sandbox control-value edits (autosave calls it with the merged workflow),
  // so capture them into the session-scoped overrides instead of dropping.
  const update = useCallback<WorkflowContextType['update']>(
    (data, options) => {
      if (!baseWorkflow) return;

      for (const updatedStep of data.steps ?? []) {
        const stepId = 'stepId' in updatedStep ? updatedStep.stepId : undefined;

        if (stepId && updatedStep.controlValues !== undefined && updatedStep.controlValues !== null) {
          setStepControlOverrides(baseWorkflow.workflowId, stepId, updatedStep.controlValues);
        }
      }

      options?.onSuccess?.(workflow ?? baseWorkflow);
    },
    [baseWorkflow, workflow, setStepControlOverrides]
  );

  const value = useMemo<WorkflowContextType>(
    () => ({
      isPending: isDiscoverPending,
      isUpdatePatchPending: false,
      workflow,
      step,
      refetch,
      update,
      patch: () => undefined,
      digestStepBeforeCurrent,
      lastSaveError: null,
    }),
    [isDiscoverPending, workflow, step, refetch, update, digestStepBeforeCurrent]
  );

  return (
    <WorkflowContext.Provider value={value}>
      <WorkflowSchemaProvider>{children}</WorkflowSchemaProvider>
    </WorkflowContext.Provider>
  );
};
