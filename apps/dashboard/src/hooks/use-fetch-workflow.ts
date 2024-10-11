import { useQuery } from '@tanstack/react-query';
import type { WorkflowResponseDto } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';
import { fetchWorkflow } from '@/api/workflows';

export const useFetchWorkflow = ({
  workflowId,
  onSuccess,
  onError,
}: {
  workflowId?: string;
  onSuccess?: (data: WorkflowResponseDto) => void;
  onError?: (error: unknown) => void;
}) => {
  const { data, isPending, error } = useQuery<WorkflowResponseDto>({
    queryKey: [QueryKeys.bridgeHealthCheck, workflowId],
    queryFn: async () => {
      try {
        const result = await fetchWorkflow({ workflowId });
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      }
    },
    enabled: !!workflowId,
  });

  return {
    workflow: data,
    isPending,
    error,
  };
};
