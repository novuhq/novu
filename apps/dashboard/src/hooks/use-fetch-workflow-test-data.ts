import { useQuery } from '@tanstack/react-query';
import type { WorkflowTestDataResponseDto } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';
import { fetchWorkflowTestData } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';

export const useFetchWorkflowTestData = ({ workflowId }: { workflowId?: string }) => {
  const { currentEnvironment } = useEnvironment();
  const { data, isPending, error } = useQuery<WorkflowTestDataResponseDto>({
    queryKey: [QueryKeys.fetchWorkflowTestData, currentEnvironment?._id, workflowId],
    queryFn: () => fetchWorkflowTestData({ workflowId }),
    enabled: !!currentEnvironment?._id && !!workflowId,
  });

  return {
    testData: data,
    isPending,
    error,
  };
};
