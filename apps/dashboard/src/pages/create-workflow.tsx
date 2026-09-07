import { FeatureFlagsKeysEnum } from '@novu/shared';
import { CreateWorkflowModal } from '@/components/create-workflow-modal';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { NewWorkflowDrawer } from '@/pages/new-workflow-drawer';

export function CreateWorkflowPage() {
  const isAiWorkflowGenerationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED);
  if (isAiWorkflowGenerationEnabled) {
    return <CreateWorkflowModal mode="create" />;
  }

  return <NewWorkflowDrawer mode="create" />;
}
