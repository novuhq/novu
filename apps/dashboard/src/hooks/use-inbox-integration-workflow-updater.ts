import { StepTypeEnum, WorkflowListResponseDto, WorkflowResponseDto } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { getWorkflow, patchWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflows } from './use-fetch-workflows';
import { useUpdateWorkflow } from './use-update-workflow';

interface UseInboxIntegrationWorkflowUpdaterOptions {
  maxToUpdate?: number;
  concurrency?: number;
}

type WorkflowSlug = WorkflowListResponseDto['slug'];

interface WorkflowOperationResult {
  workflow: WorkflowListResponseDto;
  success: boolean;
  error: Error | null;
}

interface WorkflowProcessingState {
  slugToWorkflow: Map<WorkflowSlug, WorkflowListResponseDto>;
  slugs: WorkflowSlug[];
  deactivated: Set<WorkflowSlug>;
  reactivated: Set<WorkflowSlug>;
  deactivateErrors: Map<WorkflowSlug, Error>;
  reactivateErrors: Map<WorkflowSlug, Error>;
  workflowCache: Map<WorkflowSlug, WorkflowResponseDto>;
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

  const { updateWorkflow: updateWorkflowHook } = useUpdateWorkflow();

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
      deactivated: new Set<WorkflowSlug>(),
      reactivated: new Set<WorkflowSlug>(),
      deactivateErrors: new Map<WorkflowSlug, Error>(),
      reactivateErrors: new Map<WorkflowSlug, Error>(),
      workflowCache: new Map<WorkflowSlug, WorkflowResponseDto>(),
    };
  }, []);

  const deactivateWorkflow = useCallback(
    async (slug: WorkflowSlug, environment: NonNullable<typeof currentEnvironment>, state: WorkflowProcessingState) => {
      try {
        await patchWorkflow({
          environment,
          workflowSlug: slug,
          workflow: { active: false },
        });

        state.deactivated.add(slug);
      } catch (error) {
        state.deactivateErrors.set(slug, error as Error);
      }
    },
    []
  );

  const reactivateWorkflow = useCallback(
    async (slug: WorkflowSlug, environment: NonNullable<typeof currentEnvironment>, state: WorkflowProcessingState) => {
      // Skip reactivation for workflows that failed to deactivate to avoid inconsistent states
      if (state.deactivateErrors.has(slug)) {
        return;
      }

      try {
        await patchWorkflow({
          environment,
          workflowSlug: slug,
          workflow: { active: true },
        });

        state.reactivated.add(slug);
      } catch (error) {
        state.reactivateErrors.set(slug, error as Error);
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
      try {
        let workflowData = state.workflowCache.get(slug);
        if (!workflowData) {
          workflowData = await getWorkflow({ environment, workflowSlug: slug });
          state.workflowCache.set(slug, workflowData);
        }

        await updateWorkflowHook({
          workflowSlug: slug,
          workflow: {
            name: workflowData.name,
            description: workflowData.description,
            tags: workflowData.tags,
            active: forceActive !== undefined ? forceActive : workflowData.active,
            validatePayload: workflowData.validatePayload,
            payloadSchema: workflowData.payloadSchema,
            isTranslationEnabled: workflowData.isTranslationEnabled,
            workflowId: workflowData.workflowId,
            steps: workflowData.steps,
            preferences: workflowData.preferences,
            origin: workflowData.origin,
          },
        });
      } catch (error) {
        console.error(
          `Failed to refresh workflow during inbox integration update. Slug: ${slug}, Environment: ${environment.name}`,
          error
        );
        throw error;
      }
    },
    [updateWorkflowHook]
  );

  const buildResults = useCallback((state: WorkflowProcessingState): WorkflowOperationResult[] => {
    const results: WorkflowOperationResult[] = [];

    for (const slug of state.slugs) {
      const workflow = state.slugToWorkflow.get(slug);
      if (!workflow) continue;

      const error = state.deactivateErrors.get(slug) ?? state.reactivateErrors.get(slug) ?? null;
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

    await runWithConcurrency(state.slugs, async (slug) => {
      await deactivateWorkflow(slug, environment, state);
    });

    await runWithConcurrency(Array.from(state.deactivated), async (slug) => {
      await refreshWorkflow(slug, environment, state, false);
    });

    await runWithConcurrency(state.slugs, async (slug) => {
      await reactivateWorkflow(slug, environment, state);
    });

    await runWithConcurrency(Array.from(state.reactivated), async (slug) => {
      await refreshWorkflow(slug, environment, state, true);
    });

    return buildResults(state);
  }, [
    currentEnvironment,
    workflowsWithInAppSteps,
    initializeProcessingState,
    runWithConcurrency,
    deactivateWorkflow,
    reactivateWorkflow,
    refreshWorkflow,
    buildResults,
  ]);

  return {
    workflowsWithInAppSteps,
    pauseAndEnableWorkflowsInLoop,
    isLoading,
  };
}
