import { useFeatureFlag } from './use-feature-flag';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { FeatureFlagsKeysEnum, WorkflowOriginEnum } from '@novu/shared';

export function useIsPayloadSchemaEnabled(): boolean {
  const isFeatureFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED);
  const { workflow } = useWorkflow();

  return isFeatureFlagEnabled && workflow?.payloadSchema != null && workflow.origin === WorkflowOriginEnum.NOVU_CLOUD;
}
