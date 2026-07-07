import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { WorkflowResponseDto } from '@novu/shared';
import { ReactNode, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLocalMode } from '@/context/local-mode';
import { getIdFromSlug, STEP_DIVIDER } from '@/utils/id-utils';
import { findLocalStep, findLocalWorkflow } from '@/utils/local-bridge';
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
  const { workflows, isDiscoverPending, refetchDiscover } = useLocalMode();

  const workflow = useMemo(() => findLocalWorkflow(workflows, workflowSlug), [workflows, workflowSlug]);

  const step = useMemo(() => findLocalStep(workflow, stepSlug), [workflow, stepSlug]);

  const digestStepBeforeCurrent = useMemo(() => {
    if (!workflow || !step) return undefined;

    const index = workflow.steps.findIndex(
      (candidate) =>
        getIdFromSlug({ slug: candidate.slug, divider: STEP_DIVIDER }) ===
        getIdFromSlug({ slug: step.slug, divider: STEP_DIVIDER })
    );

    if (index < 1) return undefined;

    return workflow.steps
      .slice(0, index)
      .reverse()
      .find((candidate) => candidate.type === 'digest');
  }, [workflow, step]);

  const refetch = useCallback(
    async (_options?: RefetchOptions) => {
      await refetchDiscover();

      return { data: workflow } as QueryObserverResult<WorkflowResponseDto, Error>;
    },
    [refetchDiscover, workflow]
  );

  const value = useMemo<WorkflowContextType>(
    () => ({
      isPending: isDiscoverPending,
      isUpdatePatchPending: false,
      workflow,
      step,
      refetch,
      // Virtual workflows live in code; there is nothing to persist.
      update: () => undefined,
      patch: () => undefined,
      digestStepBeforeCurrent,
      lastSaveError: null,
    }),
    [isDiscoverPending, workflow, step, refetch, digestStepBeforeCurrent]
  );

  return (
    <WorkflowContext.Provider value={value}>
      <WorkflowSchemaProvider>{children}</WorkflowSchemaProvider>
    </WorkflowContext.Provider>
  );
};
