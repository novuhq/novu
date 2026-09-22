import { useQuery } from '@tanstack/react-query';
import { getWorkflowPayloadSchemas } from '@/api/workflow-payload-schemas';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export function useWorkflowPayloadSchemas(enabled = true) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.workflowPayloadSchemas, currentEnvironment?._id],
    queryFn: () => getWorkflowPayloadSchemas(requireEnvironment(currentEnvironment, 'No environment available')),
    enabled: enabled && !!currentEnvironment?._id,
  });
}
