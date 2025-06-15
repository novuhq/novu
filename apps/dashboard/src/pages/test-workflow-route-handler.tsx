import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { TestWorkflowPage } from './test-workflow';
import { TestWorkflowDrawerPage } from './test-workflow-drawer-page';

export const TestWorkflowRouteHandler = () => {
  const isV2TemplateEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED);

  if (isV2TemplateEditorEnabled) {
    return <TestWorkflowDrawerPage />;
  }

  return <TestWorkflowPage />;
};
