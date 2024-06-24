import { Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconOutlineCable, IconPlayArrow } from '@novu/novui/icons';
import { Center } from '@novu/novui/jsx';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { testTrigger } from '../../../../api/notification-templates';
import { When } from '../../../../components/utils/When';
import { useAuth } from '../../../../hooks/useAuth';
import { ExecutionDetailsModalWrapper } from '../../../../pages/templates/components/ExecutionDetailsModalWrapper';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { ToSubscriber, WorkflowTestInputsPanel } from './WorkflowTestInputsPanel';
import { WorkflowTestTriggerPanel } from './WorkflowTestTriggerPanel';
import { getTunnelUrl } from '../../../../api/bridge/utils';
import { showNotification } from '@mantine/notifications';
import { ROUTES } from '../../../../constants/routes';
import { useTemplateFetcher } from '../../../../api/hooks/index';
import { getApiKeys } from '../../../../api/environment';

export const WorkflowsTestPage = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [to, setTo] = useState<ToSubscriber>({
    subscriberId: '',
    email: '',
  });
  const { pathname } = useLocation();
  const isLocal = useMemo(() => pathname.startsWith(ROUTES.STUDIO), [pathname]);

  const { data: apiKeys = [] } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const key = useMemo(() => apiKeys[0]?.key, [apiKeys]);

  const { template, isLoading: isTemplateLoading } = useTemplateFetcher({
    templateId: isLocal ? undefined : templateId,
  });

  const { data: workflow, isLoading: isWorkflowLoading } = useQuery(
    ['workflow', templateId],
    async () => {
      return bridgeApi.getWorkflow(templateId);
    },
    {
      enabled: isLocal,
    }
  );

  const isLoading = useMemo(
    () => (isLocal ? isWorkflowLoading : isTemplateLoading),
    [isWorkflowLoading, isTemplateLoading, isLocal]
  );

  useEffect(() => {
    if (currentUser) {
      setTo({
        subscriberId: currentUser._id as string,
        email: currentUser.email as string,
      });
    }
  }, [currentUser]);

  const stepTypes = useMemo(() => {
    if (isLocal) {
      if (!workflow) {
        return [];
      }

      return workflow.steps.map((step) => step.type);
    }

    if (!template) {
      return [];
    }

    return template.steps.map((step) => step.template.type);
  }, [workflow, isLocal, template]);

  const { mutateAsync: triggerTestEvent, isLoading: isTestLoading } = useMutation(testTrigger);
  const [transactionId, setTransactionId] = useState<string>('');
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);
  const name = useMemo(
    () => (isLocal ? workflow.workflowId : template?.triggers[0].identifier),
    [isLocal, template?.triggers, workflow?.workflowId]
  );

  const handleTestClick = async () => {
    try {
      const response = await triggerTestEvent({
        name,
        to,
        payload: {
          ...payload,
          __source: 'studio-test-workflow',
        },
        bridgeUrl: isLocal ? getTunnelUrl() : undefined,
      });

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

  if (isAuthLoading || isLoading) {
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
        <Button loading={isTestLoading} Icon={IconPlayArrow} variant="filled" onClick={handleTestClick}>
          Run a test
        </Button>
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowTestTriggerPanel identifier={name} to={to} payload={payload} apiKey={key} />
        <When truthy={!isAuthLoading && !isLoading}>
          <WorkflowTestInputsPanel
            onChange={onChange}
            payloadSchema={workflow?.data?.schema || (template as any)?.rawData?.data.schema}
            to={{
              subscriberId: currentUser?._id as string,
              email: currentUser?.email as string,
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
