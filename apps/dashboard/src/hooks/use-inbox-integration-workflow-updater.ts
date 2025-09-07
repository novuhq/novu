import { StepTypeEnum, WorkflowListResponseDto, WorkflowStatusEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { getWorkflow, updateWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflows } from './use-fetch-workflows';

interface UseInboxIntegrationWorkflowUpdaterOptions {
  maxToUpdate?: number;
}

export function useInboxIntegrationWorkflowUpdater({
  maxToUpdate = 20,
}: UseInboxIntegrationWorkflowUpdaterOptions = {}) {
  const { currentEnvironment } = useEnvironment();
  const { data: workflowsData } = useFetchWorkflows({
    limit: maxToUpdate,
    offset: 0,
    query: '',
    status: [WorkflowStatusEnum.ACTIVE],
  });

  const activeWorkflowsWithInAppSteps = useMemo(() => {
    return (
      workflowsData?.workflows?.filter((workflow) => workflow.stepTypeOverviews?.includes(StepTypeEnum.IN_APP)) ?? []
    );
  }, [workflowsData?.workflows]);

  const processWorkflow = useCallback(
    async (workflow: WorkflowListResponseDto, environment: NonNullable<typeof currentEnvironment>): Promise<void> => {
      // Get the full workflow data needed for updateWorkflow
      const fullWorkflowData = await getWorkflow({
        environment,
        workflowSlug: workflow.slug,
      });

      // Step 1: Make workflow inactive
      await updateWorkflow({
        environment,
        workflowSlug: workflow.slug,
        workflow: {
          ...fullWorkflowData,
          active: false,
        },
      });

      // Step 2: Reactivate the workflow
      await updateWorkflow({
        environment,
        workflowSlug: workflow.slug,
        workflow: {
          ...fullWorkflowData,
          active: true,
        },
      });
    },
    []
  );

  const updateActiveWorkflowsWithInAppSteps = useCallback(async (): Promise<void> => {
    if (!currentEnvironment) return;

    for (const workflow of activeWorkflowsWithInAppSteps) {
      await processWorkflow(workflow, currentEnvironment);
    }
  }, [activeWorkflowsWithInAppSteps, processWorkflow, currentEnvironment]);

  return {
    updateActiveWorkflowsWithInAppSteps,
  };
}

/*
 * STEP-BY-STEP EXECUTION AND LOGIC:
 *
 * 1. HOOK INITIALIZATION:
 *    - Fetches workflows from the API using useFetchWorkflows with server-side status filtering
 *    - Only fetches ACTIVE workflows from the server (status: [WorkflowStatusEnum.ACTIVE])
 *
 * 2. WORKFLOW FILTERING (activeWorkflowsWithInAppSteps):
 *    - Filters the already-active workflows to only include those with IN_APP steps
 *    - Only processes workflows that have StepTypeEnum.IN_APP in their stepTypeOverviews
 *    - Inactive or disabled workflows are filtered out at the server level
 *
 * 3. WORKFLOW PROCESSING (processWorkflow function):
 *    For each active workflow with in-app steps, executes this exact sequence:
 *
 *    Step 1: DEACTIVATE
 *    - Fetches full workflow data using getWorkflow
 *    - Calls updateWorkflow with { active: false }
 *    - Makes the workflow inactive temporarily
 *
 *    Step 2: REACTIVATE
 *    - Calls updateWorkflow with { active: true }
 *    - Makes the workflow active again
 *
 * 4. MAIN EXECUTION (updateActiveWorkflowsWithInAppSteps):
 *    - Processes workflows sequentially (no concurrency)
 *    - No validation - assumes environment and workflows are available
 *    - No error handling - failures will propagate up
 *
 * 5. RETURN VALUES:
 *    - updateActiveWorkflowsWithInAppSteps: Function to execute the update process
 *
 * PURPOSE:
 * This hook is designed to refresh/update active workflows that contain in-app notification steps,
 * likely for inbox integration purposes. The deactivate->reactivate pattern ensures
 * that the workflow is properly refreshed while maintaining its active state.
 */
