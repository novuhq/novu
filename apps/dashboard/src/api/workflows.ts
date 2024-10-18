import type { CreateWorkflowDto, WorkflowResponseDto } from '@novu/shared';
import { getV2, postV2 } from './api.client';

export const fetchWorkflow = async ({ workflowId }: { workflowId?: string }): Promise<WorkflowResponseDto> => {
  const { data } = await getV2<{ data: WorkflowResponseDto }>(`/workflows/${workflowId}`);

  return data;
};

export async function createWorkflow(payload: CreateWorkflowDto) {
  return postV2<{ data: WorkflowResponseDto }>(`/workflows`, payload);
}
