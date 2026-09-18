import type { WorkflowPayloadSchemasResponseDto } from '@novu/shared';
import type { IEnvironment } from '@/types/environment';
import { getV2 } from './api.client';

export async function getWorkflowPayloadSchemas(environment: IEnvironment): Promise<WorkflowPayloadSchemasResponseDto> {
  const { data } = await getV2<{ data: WorkflowPayloadSchemasResponseDto }>('/workflows/payload-schemas', {
    environment,
  });

  return data;
}
