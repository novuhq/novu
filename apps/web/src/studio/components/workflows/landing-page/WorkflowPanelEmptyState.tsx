import { PageContainer } from '../../../layout/index';
import { css } from '@novu/novui/css';
import { WorkflowPlaceholderPageContent } from './WorkflowPlaceholderPageContent';

export function WorkflowPlaceholderPage() {
  return (
    <PageContainer className={css({ alignContent: 'center' })}>
      <WorkflowPanelEmptyStateContent />
    </PageContainer>
  );
}
function WorkflowPanelEmptyStateContent() {
  return (
    <WorkflowPlaceholderPageContent docsButtonLabel="Learn more in the docs">
      A workflow holds the entire flow of steps that are sent to the subscriber.
      <br />
      Get started by adding your first workflow in your local environment.
    </WorkflowPlaceholderPageContent>
  );
}

function WorkflowPanelUnconnectedContent() {
  return (
    <WorkflowPlaceholderPageContent docsButtonLabel="See our troubleshooting guide">
      Local environment disconnected from Novu Bridge URL.
      <br />
      Likely due to browser internet loss, but other causes possible.
    </WorkflowPlaceholderPageContent>
  );
}
