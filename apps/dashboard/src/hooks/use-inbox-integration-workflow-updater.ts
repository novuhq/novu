import { EnvironmentTypeEnum, StepTypeEnum, WorkflowListResponseDto, WorkflowStatusEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { getWorkflow, updateWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflows } from './use-fetch-workflows';

type UseInboxIntegrationWorkflowUpdaterOptions = {
  maxToUpdate?: number;
};

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
      const fullWorkflowData = await getWorkflow({
        environment,
        workflowSlug: workflow.slug,
      });

      await updateWorkflow({
        environment,
        workflowSlug: workflow.slug,
        workflow: {
          ...fullWorkflowData,
          active: false,
        },
      });

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
    if (!currentEnvironment || currentEnvironment.type !== EnvironmentTypeEnum.DEV) return;

    for (const workflow of activeWorkflowsWithInAppSteps) {
      await processWorkflow(workflow, currentEnvironment);
    }
  }, [activeWorkflowsWithInAppSteps, processWorkflow, currentEnvironment]);

  return {
    updateActiveWorkflowsWithInAppSteps,
  };
}
