import { ResourceOriginEnum } from '@novu/shared';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

export function useIsPayloadSchemaEnabled(): boolean {
  const { workflow } = useWorkflow();

  return workflow?.payloadSchema != null && workflow.origin === ResourceOriginEnum.NOVU_CLOUD;
}
