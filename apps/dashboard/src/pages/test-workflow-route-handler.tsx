import { Navigate, useParams } from 'react-router-dom';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TestWorkflowPage } from './test-workflow';

export const TestWorkflowRouteHandler = () => {
  const { environmentSlug, workflowSlug } = useParams<{
    environmentSlug: string;
    workflowSlug: string;
  }>();

  if (environmentSlug && workflowSlug) {
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
