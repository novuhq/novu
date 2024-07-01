import { Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconOutlineCable, IconPlayArrow } from '@novu/novui/icons';
import { Center } from '@novu/novui/jsx';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkflow, useWorkflowTrigger } from '../../../hooks/useBridgeAPI';
import { When } from '../../../../components/utils/When';
import { ExecutionDetailsModalWrapper } from '../../../../pages/templates/components/ExecutionDetailsModalWrapper';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { ToSubscriber, WorkflowTestControlsPanel } from './WorkflowTestControlsPanel';
import { WorkflowTestTriggerPanel } from './WorkflowTestTriggerPanel';
import { showNotification } from '@mantine/notifications';
import { useTemplateFetcher } from '../../../../api/hooks/index';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { useStudioState } from '../../../StudioStateProvider';
import { testTrigger } from '../../../../api/notification-templates';
import { useApiKeys } from '../../../../hooks/useNovuAPI';

export const WorkflowsTestPage = () => {
  const segment = useSegment();
  const { local, testUser } = useStudioState() || {};
  const { templateId = '' } = useParams<{ templateId: string }>();
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [to, setTo] = useState<ToSubscriber>({
    subscriberId: '',
    email: '',
  });

  const { data: apiKeys = [] } = useApiKeys();
  const key = useMemo(() => apiKeys[0]?.key, [apiKeys]);

  const { template, isLoading: isTemplateLoading } = useTemplateFetcher({
    templateId: local ? undefined : templateId,
  });
  const { mutateAsync: triggerCloudTestEvent, isLoading: isCloudTestLoading } = useMutation(testTrigger);
  const { data: workflow, isLoading: isWorkflowLoading } = useWorkflow(templateId, { enabled: local });
  const { trigger, isLoading: isTestLoading } = useWorkflowTrigger();

  const isLoading = useMemo(
    () => (local ? isWorkflowLoading : isTemplateLoading),
    [isWorkflowLoading, isTemplateLoading, local]
  );

  useEffect(() => {
    if (testUser) {
      setTo({
        subscriberId: testUser.id,
        email: testUser.emailAddress,
      });
    }
  }, [testUser]);

  const stepTypes = useMemo(() => {
    if (local) {
      if (!workflow) {
        return [];
      }

      return workflow.steps.map((step) => step.type);
    }

    if (!template) {
      return [];
    }

    return template.steps.map((step) => step.template.type);
  }, [workflow, local, template]);

  const [transactionId, setTransactionId] = useState<string>('');
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);
  const workflowId = useMemo(
    () => (local ? workflow?.workflowId : template?.triggers[0].identifier),
    [local, template?.triggers, workflow?.workflowId]
  );

  const handleTestClick = async () => {
    segment.track('Workflow test ran - [Workflows Test Page]', {
      env: local ? 'local' : 'cloud',
    });

    try {
      payload.__source = 'studio-test-workflow';

      let response;
      if (local) {
        const bridgeResponse = await trigger({
          workflowId: workflowId,
          to,
          payload,
        });

        response = bridgeResponse.data;
      } else {
        response = await triggerCloudTestEvent({
          name: workflowId,
          to,
          payload: {
            ...payload,
          },
        });
      }

      setTransactionId(response.transactionId || '');
      openExecutionModal();
    } catch (e) {
      showNotification({
        message: (e as Error).message,
        color: 'red',
      });
    }
  };

  const onChange = (payloadValues, toValues) => {
    if (toValues) {
      setTo(toValues);
    }
    if (payloadValues) {
      setPayload(payloadValues);
    }
  };

  if (local ? isWorkflowLoading : isTemplateLoading) {
    return (
      <Center
        className={css({
          marginTop: '375',
        })}
      >
        <Loader color="indigo" size={32} />
      </Center>
    );
  }

  return (
    <WorkflowsPageTemplate
      title="Test workflow"
      description="Trigger a test run for this workflow"
      icon={<IconOutlineCable size="32" />}
      actions={
        <Button loading={isTestLoading} Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
          Test workflow
        </Button>
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowTestTriggerPanel identifier={workflowId} to={to} payload={payload} apiKey={key} />
        <When truthy={!isLoading}>
          <WorkflowTestControlsPanel
            onChange={onChange}
            payloadSchema={
              workflow?.payload?.schema ||
              workflow?.data?.schema ||
              (template as any)?.rawData?.payload?.schema ||
              (template as any)?.rawData?.data?.schema
            }
            to={{
              subscriberId: testUser?.id || '',
              email: testUser?.emailAddress || '',
            }}
            stepTypes={stepTypes}
          />
        </When>
      </WorkflowsPanelLayout>
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
    </WorkflowsPageTemplate>
  );
};
