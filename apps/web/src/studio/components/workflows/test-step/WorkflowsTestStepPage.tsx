import { Button } from '@novu/novui';
import { IconOutlineCable, IconPlayArrow } from '@novu/novui/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { testTrigger } from '../../../../api/notification-templates';
import { useAuth } from '../../../../hooks/useAuth';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowTestStepInputsPanel } from './WorkflowTestStepInputsPanel';
import { WorkflowTestStepTriggerPanel } from './WorkflowTestStepTriggerPanel';

export const WorkflowsTestStepPage = () => {
  const { currentUser } = useAuth();
  const { templateId = '' } = useParams<{ templateId: string }>();

  const { data: workflow, isLoading } = useQuery(['workflow', templateId], async () => {
    return bridgeApi.getWorkflow(templateId);
  });

  console.log(workflow?.data);

  const { mutateAsync: triggerTestEvent } = useMutation(testTrigger);

  const handleTestClick = async () => {
    // TODO: this is just a temporary step for connecting the prototype
    alert('Running test! WOW!');
    const to = {
      subscriberId: currentUser?._id,
      email: currentUser?.email,
    };

    const response = await triggerTestEvent({
      name: workflow.workflowId,
      to,
      payload: {
        __source: 'studio-test-workflow',
      },
    });
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
