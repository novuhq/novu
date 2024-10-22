import { useQuery } from '@tanstack/react-query';
import type { WorkflowResponseDto } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';
import { fetchWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';

export const useFetchWorkflow = ({ workflowId }: { workflowId?: string }) => {
  const { currentEnvironment } = useEnvironment();
  const { data, isPending, error } = useQuery<WorkflowResponseDto>({
    queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id, workflowId],
    queryFn: () => fetchWorkflow({ workflowId }),
    enabled: !!currentEnvironment?._id && !!workflowId,
  });

  return {
    workflow: data,
    isPending,
    error,
  };
};
