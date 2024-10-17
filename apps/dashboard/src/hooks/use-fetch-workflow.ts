import { useQuery } from '@tanstack/react-query';
import type { WorkflowResponseDto } from '@novu/shared';
import { QueryKeys } from '@/utils/query-keys';
import { fetchWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';

export const useFetchWorkflow = ({
  workflowId,
  onSuccess,
  onError,
}: {
  workflowId?: string;
  onSuccess?: (data: WorkflowResponseDto) => void;
  onError?: (error: unknown) => void;
}) => {
  const { currentEnvironment } = useEnvironment();
  const { data, isPending, error } = useQuery<WorkflowResponseDto>({
    queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id, workflowId],
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
    enabled: !!currentEnvironment?._id && !!workflowId,
  });

  return {
    workflow: data,
    isPending,
    error,
  };
};
