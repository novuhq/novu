import { Button } from '@novu/novui';
import { IconOutlineCable, IconPlayArrow } from '@novu/novui/icons';
import { Stack } from '@novu/novui/jsx';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { testTrigger } from '../../../../api/notification-templates';
import { When } from '../../../../components/utils/When';
import { useAuth } from '../../../../hooks/useAuth';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { ToSubscriber, WorkflowTestStepInputsPanel } from './WorkflowTestStepInputsPanel';
import { WorkflowTestStepTriggerPanel } from './WorkflowTestStepTriggerPanel';

export const WorkflowsTestStepPage = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [to, setTo] = useState<ToSubscriber>({
    subscriberId: '',
    email: '',
  });

  const { data: workflow, isLoading: isWorkflowLoading } = useQuery(['workflow', templateId], async () => {
    return bridgeApi.getWorkflow(templateId);
  });

  const stepTypes = useMemo(() => {
    if (!workflow) {
      return [];
    }

    return workflow.steps.map((step) => step.type);
  }, [workflow]);

  const { mutateAsync: triggerTestEvent, isLoading: isTestLoading } = useMutation(testTrigger);

  const handleTestClick = async () => {
    const response = await triggerTestEvent({
      name: workflow.workflowId,
      to,
      payload: {
        ...payload,
        __source: 'studio-test-workflow',
      },
    });
  };

  if (isAuthLoading || isWorkflowLoading || isTestLoading || !currentUser) {
    return null;
  }

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
        <When truthy={!isAuthLoading && !isWorkflowLoading}>
          <WorkflowTestStepInputsPanel
            onChange={(payloadValues, toValues) => {
              if (toValues) {
                setTo(toValues);
              }
              if (payloadValues) {
                setPayload(payloadValues);
              }
            }}
            payloadSchema={workflow?.data?.schema}
            to={{
              subscriberId: currentUser._id,
              email: currentUser.email as string,
            }}
            stepTypes={stepTypes}
          />
        </When>
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
