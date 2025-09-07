import { IEnvironment, StepTypeEnum, WorkflowListResponseDto, WorkflowResponseDto } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { getWorkflow, patchWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflows } from './use-fetch-workflows';

type UseInboxIntegrationWorkflowUpdaterOptions = {
  maxToUpdate?: number;
  concurrency?: number;
};

type WorkflowSlug = WorkflowListResponseDto['slug'];

type WorkflowOperationResult = {
  workflow: WorkflowListResponseDto;
  success: boolean;
  error: Error | null;
};

type WorkflowProcessingState = {
  slugToWorkflow: Map<WorkflowSlug, WorkflowListResponseDto>;
  slugs: WorkflowSlug[];
  originalActiveStates: Map<WorkflowSlug, boolean>;
  deactivated: Set<WorkflowSlug>;
  restored: Set<WorkflowSlug>;
  deactivateErrors: Map<WorkflowSlug, Error>;
  restoreErrors: Map<WorkflowSlug, Error>;
  workflowCache: Map<WorkflowSlug, WorkflowResponseDto>;
};

function getWorkflowFromCache(state: WorkflowProcessingState, slug: WorkflowSlug): WorkflowResponseDto | undefined {
  return state.workflowCache.get(slug);
}

async function fetchAndCacheWorkflow(
  state: WorkflowProcessingState,
  slug: WorkflowSlug,
  environment: IEnvironment
): Promise<WorkflowResponseDto> {
  const data = await getWorkflow({ environment, workflowSlug: slug });
  state.workflowCache.set(slug, data);

  return data;
}

async function ensureWorkflowData(
  state: WorkflowProcessingState,
  slug: WorkflowSlug,
  environment: IEnvironment
): Promise<WorkflowResponseDto> {
  const cached = getWorkflowFromCache(state, slug);
  if (cached) return cached;

  return fetchAndCacheWorkflow(state, slug, environment);
}

async function patchActiveState(environment: IEnvironment, slug: WorkflowSlug, active: boolean): Promise<void> {
  await patchWorkflow({ environment, workflowSlug: slug, workflow: { active } });
}

function rememberOriginalActiveState(
  state: WorkflowProcessingState,
  slug: WorkflowSlug,
  active: boolean | undefined
): void {
  if (!state.originalActiveStates.has(slug)) {
    state.originalActiveStates.set(slug, Boolean(active));
  }
}

export function useInboxIntegrationWorkflowUpdater({
  maxToUpdate = 20,
  concurrency = 4,
}: UseInboxIntegrationWorkflowUpdaterOptions = {}) {
  const { currentEnvironment } = useEnvironment();
  const { data: workflowsData, isLoading } = useFetchWorkflows({
    limit: maxToUpdate,
    offset: 0,
    query: '',
  });

  const workflowsWithInAppSteps = useMemo(() => {
    return (
      workflowsData?.workflows?.filter((workflow) => workflow.stepTypeOverviews?.includes(StepTypeEnum.IN_APP)) ?? []
    );
  }, [workflowsData?.workflows]);

  const runWithConcurrency = useCallback(
    async <T, R>(items: T[], worker: (item: T) => Promise<R>, maxConcurrency = concurrency): Promise<R[]> => {
      const results: R[] = [];
      let index = 0;

      const runNext = async (): Promise<void> => {
        const currentIndex = index++;
        if (currentIndex >= items.length) return;

        try {
          const result = await worker(items[currentIndex]);
          results.push(result);
        } finally {
          await runNext();
        }
      };

      const runners = Array.from({ length: Math.min(maxConcurrency, items.length) }, () => runNext());
      await Promise.all(runners);

      return results;
    },
    [concurrency]
  );

  const initializeProcessingState = useCallback((workflows: WorkflowListResponseDto[]): WorkflowProcessingState => {
    const slugToWorkflow = new Map<WorkflowSlug, WorkflowListResponseDto>(
      workflows.map((workflow) => [workflow.slug, workflow])
    );

    return {
      slugToWorkflow,
      slugs: Array.from(slugToWorkflow.keys()),
      originalActiveStates: new Map<WorkflowSlug, boolean>(),
      deactivated: new Set<WorkflowSlug>(),
      restored: new Set<WorkflowSlug>(),
      deactivateErrors: new Map<WorkflowSlug, Error>(),
      restoreErrors: new Map<WorkflowSlug, Error>(),
      workflowCache: new Map<WorkflowSlug, WorkflowResponseDto>(),
    };
  }, []);

  const deactivateWorkflow = useCallback(
    async (slug: WorkflowSlug, environment: NonNullable<typeof currentEnvironment>, state: WorkflowProcessingState) => {
      try {
        const workflowData = await ensureWorkflowData(state, slug, environment);
        rememberOriginalActiveState(state, slug, workflowData.active);

        if (workflowData.active) {
          await patchActiveState(environment, slug, false);
          state.deactivated.add(slug);
        }
      } catch (error) {
        state.deactivateErrors.set(slug, error as Error);
      }
    },
    []
  );

  const restoreWorkflowState = useCallback(
    async (slug: WorkflowSlug, environment: NonNullable<typeof currentEnvironment>, state: WorkflowProcessingState) => {
      // Skip restoration for workflows that failed to deactivate to avoid inconsistent states
      if (state.deactivateErrors.has(slug)) {
        return;
      }

      const originalActiveState = state.originalActiveStates.get(slug);
      if (originalActiveState === undefined) {
        return;
      }

      // Only restore if the workflow was originally active (meaning we deactivated it)
      if (originalActiveState) {
        try {
          await patchActiveState(environment, slug, true);
          state.restored.add(slug);
        } catch (error) {
          state.restoreErrors.set(slug, error as Error);
        }
      }
    },
    []
  );

  const refreshWorkflow = useCallback(
    async (
      slug: WorkflowSlug,
      environment: NonNullable<typeof currentEnvironment>,
      state: WorkflowProcessingState,
      forceActive?: boolean
    ) => {
      const workflowData = await ensureWorkflowData(state, slug, environment);
      const nextActive = forceActive !== undefined ? forceActive : Boolean(workflowData.active);
      await patchActiveState(environment, slug, nextActive);
    },
    []
  );

  const buildResults = useCallback((state: WorkflowProcessingState): WorkflowOperationResult[] => {
    const results: WorkflowOperationResult[] = [];

    for (const slug of state.slugs) {
      const workflow = state.slugToWorkflow.get(slug);
      if (!workflow) continue;

      const error = state.deactivateErrors.get(slug) ?? state.restoreErrors.get(slug) ?? null;
      results.push({
        workflow,
        success: !error,
        error,
      });
    }

    return results;
  }, []);

  const pauseAndEnableWorkflowsInLoop = useCallback(async (): Promise<WorkflowOperationResult[]> => {
    const environment = currentEnvironment;
    if (!environment || !workflowsWithInAppSteps.length) {
      return [];
    }

    const state = initializeProcessingState(workflowsWithInAppSteps);

    // Step 1: Deactivate active workflows and store original states
    await runWithConcurrency(state.slugs, async (slug) => {
      await deactivateWorkflow(slug, environment, state);
    });

    // Step 2: Refresh workflows while they are deactivated (only for workflows that were actually deactivated)
    await runWithConcurrency(Array.from(state.deactivated), async (slug) => {
      await refreshWorkflow(slug, environment, state, false);
    });

    // Step 3: Restore workflows to their original active state
    await runWithConcurrency(state.slugs, async (slug) => {
      await restoreWorkflowState(slug, environment, state);
    });

    // Step 4: Refresh workflows while they are in their original state (only for workflows that were restored)
    await runWithConcurrency(Array.from(state.restored), async (slug) => {
      const originalActiveState = state.originalActiveStates.get(slug);
      if (originalActiveState !== undefined) {
        await refreshWorkflow(slug, environment, state, originalActiveState);
      }
    });

    return buildResults(state);
  }, [
    currentEnvironment,
    workflowsWithInAppSteps,
    initializeProcessingState,
    runWithConcurrency,
    deactivateWorkflow,
    restoreWorkflowState,
    refreshWorkflow,
    buildResults,
  ]);

  return {
    workflowsWithInAppSteps,
    pauseAndEnableWorkflowsInLoop,
    isLoading,
  };
}
