import { getV2 } from './api.client';
import { WorkflowResponseDto } from '@novu/shared';

export const fetchWorkflow = async ({ workflowId }: { workflowId?: string }): Promise<WorkflowResponseDto> => {
  const { data } = await getV2<{ data: WorkflowResponseDto }>(`/workflows/${workflowId}`);

  return data;
};
