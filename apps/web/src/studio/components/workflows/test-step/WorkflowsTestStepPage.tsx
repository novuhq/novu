import { Button } from '@novu/novui';
import { IconOutlineCable, IconPlayArrow } from '@novu/novui/icons';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowTestStepInputsPanel } from './WorkflowTestStepInputsPanel';
import { WorkflowTestStepTriggerPanel } from './WorkflowTestStepTriggerPanel';

export const WorkflowsTestStepPage = () => {
  const handleTestClick = () => {
    // TODO: this is just a temporary step for connecting the prototype
    alert('Running test! WOW!');
  };

  return (
    <WorkflowsPageTemplate
      title="Test workflow steps"
      description="Test trigger as if you sent it from your API"
      icon={<IconOutlineCable size="32" />}
      actions={
        <Button Icon={IconPlayArrow} variant="filled" onClick={handleTestClick}>
          Run a test
        </Button>
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowTestStepTriggerPanel />
        <WorkflowTestStepInputsPanel />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
