import { ROUTES } from '../../../../constants/routes';
import { useDiscover, useStudioNavigate } from '../../../hooks';
import { WorkflowsDetailPage } from '../node-view/WorkflowsDetailPage';
import { WorkflowPlaceholderPage } from './WorkflowPanelEmptyState';

export const LocalStudioWorkflowLandingPage = () => {
  const { data, isLoading } = useDiscover();
  const navigate = useStudioNavigate();
  const hasWorkflows = data?.workflows && data?.workflows?.length > 0;

  if (isLoading) {
    return <WorkflowsDetailPage.LoadingDisplay />;
  }

  if (!hasWorkflows) {
    return <WorkflowPlaceholderPage />;
  }

  if (hasWorkflows) {
    navigate(ROUTES.STUDIO_FLOWS_VIEW, { templateId: data?.workflows[0].workflowId });
  }

  return <></>;
};
