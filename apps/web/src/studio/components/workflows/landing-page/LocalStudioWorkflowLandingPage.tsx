import { useBridgeConnectionStatus, useDiscover, useStudioWorkflowsNavigation } from '../../../hooks';
import { WorkflowsDetailPage } from '../node-view/WorkflowsDetailPage';
import { WorkflowPlaceholderPage } from './WorkflowPlaceholderPage';

export const LocalStudioWorkflowLandingPage = () => {
  const { data, isLoading } = useDiscover();
  const { goToWorkflow } = useStudioWorkflowsNavigation();
  const { status } = useBridgeConnectionStatus();

  const hasWorkflows = data?.workflows && data?.workflows?.length > 0;

  if (isLoading) {
    return <WorkflowsDetailPage.LoadingDisplay />;
  }

  if (status === 'disconnected') {
    return (
      <WorkflowPlaceholderPage title={'Studio Disconnected'} docsButtonLabel="See our troubleshooting guide">
        Local environment disconnected from Novu Bridge URL.
        <br />
        This usually happens when your Bridge app is not running or <code>npx novu dev</code> is not running.
      </WorkflowPlaceholderPage>
    );
  }

  if (hasWorkflows) {
    goToWorkflow(data?.workflows[0].workflowId);

    return null;
  }

  return (
    <WorkflowPlaceholderPage title={'No Workflows Available'} docsButtonLabel="Learn more in the docs">
      A workflow holds the entire flow of steps that are sent to the subscriber.
      <br />
      Get started by adding your first workflow in your local environment.
    </WorkflowPlaceholderPage>
  );
};
