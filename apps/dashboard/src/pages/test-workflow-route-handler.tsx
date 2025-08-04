import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Navigate, useParams } from 'react-router-dom';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TestWorkflowPage } from './test-workflow';

export const TestWorkflowRouteHandler = () => {
  const isV2TemplateEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED);
  const { environmentSlug, workflowSlug } = useParams<{
    environmentSlug: string;
    workflowSlug: string;
  }>();

  if (isV2TemplateEditorEnabled && environmentSlug && workflowSlug) {
    return (
      <Navigate
        to={buildRoute(ROUTES.TRIGGER_WORKFLOW, {
          environmentSlug,
          workflowSlug,
        })}
        replace
      />
    );
  }

  return <TestWorkflowPage />;
};
