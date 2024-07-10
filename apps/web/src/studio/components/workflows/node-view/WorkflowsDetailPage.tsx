import { Skeleton } from '@mantine/core';
import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow } from '@novu/novui/icons';
import { Stack } from '@novu/novui/jsx';
import { token } from '@novu/novui/tokens';
import { useEffect } from 'react';
import { useTelemetry } from '../../../../hooks/useNovuAPI';
import { useWorkflow } from '../../../hooks/useBridgeAPI';
import { useStudioWorkflowsNavigation } from '../../../hooks/useStudioWorkflowsNavigation';
import { PageContainer } from '../../../layout/PageContainer';
import { useStudioState } from '../../../StudioStateProvider';
import { OutlineButton } from '../../OutlineButton';
import { WorkflowsPageTemplate } from '../layout/WorkflowsPageTemplate';
import { WorkflowBackgroundWrapper } from './WorkflowBackgroundWrapper';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';
import { WorkflowNodes } from './WorkflowNodes';

export const WorkflowsDetailPage = () => {
  const { currentWorkflowId, goToStep, goToTest } = useStudioWorkflowsNavigation();
  const { data: workflow, isLoading } = useWorkflow(currentWorkflowId);
  const track = useTelemetry();
  const { isLocalStudio } = useStudioState() || {};

  useEffect(() => {
    track('Workflow open - [Studio]', {
      workflowId: currentWorkflowId,
      env: isLocalStudio ? 'local' : 'cloud',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <WorkflowsContentLoading />;
  }

  const title = workflow?.workflowId;

  return (
    <WorkflowsPageTemplate
      icon={<IconCable size="32" />}
      title={title}
      actions={
        <>
          <OutlineButton Icon={IconPlayArrow} onClick={() => goToTest(currentWorkflowId)}>
            Test workflow
          </OutlineButton>
        </>
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
    </WorkflowsPageTemplate>
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
