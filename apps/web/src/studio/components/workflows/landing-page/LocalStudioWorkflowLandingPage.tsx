import { css } from '@novu/novui/css';
import { ROUTES } from '../../../../constants/routes';
import {
  useBridgeConnectionStatus,
  useDiscover,
  useStudioNavigate,
  useStudioWorkflowsNavigation,
} from '../../../hooks';
import { WorkflowsDetailPage } from '../node-view/WorkflowsDetailPage';
import { WorkflowPlaceholderPageContent } from './WorkflowPlaceholderPageContent';
import { PageContainer } from '../../../layout';

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
      <PageContainer className={css({ alignContent: 'center' })}>
        <WorkflowPlaceholderPageContent docsButtonLabel="See our troubleshooting guide">
          Local environment disconnected from endpoint URL.
          <br />
          Likely due to browser internet loss, but other causes possible.
        </WorkflowPlaceholderPageContent>
      </PageContainer>
    );
  }

  if (hasWorkflows) {
    goToWorkflow(data?.workflows[0].workflowId);

    return null;
  }

  return (
    <PageContainer className={css({ alignContent: 'center' })}>
      <WorkflowPlaceholderPageContent docsButtonLabel="Learn more in the docs">
        A workflow holds the entire flow of steps that are sent to the subscriber.
        <br />
        Get started by adding your first workflow in your local environment.
      </WorkflowPlaceholderPageContent>{' '}
    </PageContainer>
  );
};
