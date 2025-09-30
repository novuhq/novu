import { Skeleton } from '@mantine/core';
import { IconButton, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow, IconSettings } from '@novu/novui/icons';
import { HStack, Stack } from '@novu/novui/jsx';
import { token } from '@novu/novui/tokens';
import { useEffect, useState } from 'react';
import { useTelemetry } from '../../../../hooks/useNovuAPI';
import { useWorkflow } from '../../../hooks/useBridgeAPI';
import { useStudioWorkflowsNavigation } from '../../../hooks/useStudioWorkflowsNavigation';
import { PageContainer } from '../../../layout/PageContainer';
import { useStudioState } from '../../../StudioStateProvider';
import { OutlineButton } from '../../OutlineButton';
import { WorkflowsPageTemplate } from '../layout/WorkflowsPageTemplate';
import { StudioWorkflowSettingsSidePanel } from '../preferences/StudioWorkflowSettingsSidePanel';
import { WorkflowDetailFormContextProvider } from '../preferences/WorkflowDetailFormContextProvider';
import { WorkflowBackgroundWrapper } from './WorkflowBackgroundWrapper';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';
import { WorkflowNodes } from './WorkflowNodes';
import { WorkflowNotFound } from '../WorkflowNotFound';

const BaseWorkflowsDetailPage = () => {
  const { currentWorkflowId, goToStep, goToTest } = useStudioWorkflowsNavigation();
  const { data: workflow, isLoading } = useWorkflow(currentWorkflowId);
  const track = useTelemetry();
  const { isLocalStudio } = useStudioState() || {};

  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);

  useEffect(() => {
    track('Workflow open - [Studio]', {
      workflowId: currentWorkflowId,
      env: isLocalStudio ? 'local' : 'cloud',
    });
  }, []);

  if (isLoading) {
    return <WorkflowsContentLoading />;
  }

  if (!workflow) {
    return <WorkflowNotFound />;
  }

  const title = workflow?.name || workflow.workflowId;

  return (
    <WorkflowsPageTemplate
      className={css({ p: 0, paddingBlockStart: 0, overflowY: 'auto' })}
      icon={<IconCable size="32" />}
      title={title}
      actions={
        <HStack gap="75">
          <OutlineButton Icon={IconPlayArrow} onClick={() => goToTest(currentWorkflowId)}>
            Test workflow
          </OutlineButton>
          <IconButton Icon={IconSettings} onClick={() => setPanelOpen(true)} />
        </HStack>
      }
    >
      <WorkflowBackgroundWrapper>
        <WorkflowNodes
          steps={workflow?.steps || []}
          onTriggerClick={() => goToTest(currentWorkflowId)}
          onStepClick={(step) => {
            goToStep(currentWorkflowId, step.stepId);
          }}
        />
      </WorkflowBackgroundWrapper>
      <WorkflowFloatingMenu
        className={css({
          zIndex: 'docked',
          position: 'fixed',
          // TODO: need to talk with Nik about how to position this
          top: '[182px]',
          right: '50',
        })}
      />
      {isPanelOpen && <StudioWorkflowSettingsSidePanel onClose={() => setPanelOpen(false)} />}
    </WorkflowsPageTemplate>
  );
};

export const WorkflowsDetailPage = () => {
  return (
    <WorkflowDetailFormContextProvider>
      <BaseWorkflowsDetailPage />
    </WorkflowDetailFormContextProvider>
  );
};

WorkflowsDetailPage.LoadingDisplay = WorkflowsContentLoading;

function WorkflowsContentLoading() {
  return (
    <PageContainer>
      <Stack pl={'75'} py={'150'}>
        <Skeleton height={token('lineHeights.100')} width={'20%'} radius="md" />
      </Stack>
      <WorkflowNodes.LoadingDisplay />
    </PageContainer>
  );
}
