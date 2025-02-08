import { useQuery } from '@tanstack/react-query';
import type { WorkflowTestDataResponseDto } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';
import { getWorkflowTestData } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { getWorkflowIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/step';

export const useFetchWorkflowTestData = ({ workflowSlug }: { workflowSlug: string }) => {
  const { currentEnvironment } = useEnvironment();
  const { data, isPending, error } = useQuery<WorkflowTestDataResponseDto>({
    queryKey: [
      QueryKeys.fetchWorkflowTestData,
      currentEnvironment?._id,
      getWorkflowIdFromSlug({ slug: workflowSlug, divider: WORKFLOW_DIVIDER }),
    ],
    queryFn: () => getWorkflowTestData({ environment: currentEnvironment!, workflowSlug }),
    enabled: !!currentEnvironment?._id && !!workflowSlug,
    gcTime: 0,
  });

  return {
    testData: data,
    isPending,
    error,
  };
};
