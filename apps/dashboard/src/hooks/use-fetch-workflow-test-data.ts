import type { WorkflowTestDataResponseDto } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getWorkflowTestData } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchWorkflowTestData = ({ workflowSlug }: { workflowSlug: string }) => {
  const { currentEnvironment } = useEnvironment();
  const { data, isPending, error } = useQuery<WorkflowTestDataResponseDto>({
    queryKey: [
      QueryKeys.fetchWorkflowTestData,
      currentEnvironment?._id,
      getIdFromSlug({ slug: workflowSlug, divider: WORKFLOW_DIVIDER }),
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
