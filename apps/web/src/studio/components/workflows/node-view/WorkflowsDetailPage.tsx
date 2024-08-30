import { Skeleton } from '@mantine/core';
import { IconButton } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow, IconSettings } from '@novu/novui/icons';
import { HStack, Stack } from '@novu/novui/jsx';
import { token } from '@novu/novui/tokens';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';
import { useTelemetry } from '../../../../hooks/useNovuAPI';
import { useWorkflow } from '../../../hooks/useBridgeAPI';
import { useStudioWorkflowsNavigation } from '../../../hooks/useStudioWorkflowsNavigation';
import { PageContainer } from '../../../layout/PageContainer';
import { useStudioState } from '../../../StudioStateProvider';
import { OutlineButton } from '../../OutlineButton';
import { WorkflowsPageTemplate } from '../layout/WorkflowsPageTemplate';
import { WorkflowSettingsSidePanel } from '../preferences/WorkflowSettingsSidePanel';
import { WorkflowBackgroundWrapper } from './WorkflowBackgroundWrapper';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';
import { WorkflowNodes } from './WorkflowNodes';

export const WorkflowsDetailPage = () => {
  const { currentWorkflowId, goToStep, goToTest } = useStudioWorkflowsNavigation();
  const { data: workflow, isLoading } = useWorkflow(currentWorkflowId);
  const track = useTelemetry();
  const { isLocalStudio } = useStudioState() || {};

  const areWorkflowPreferencesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED);

  // TODO: this is a temporary solution while we scaffold the components, and should be replaced w/ modal manager
  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);

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
      className={css({ p: 0, paddingBlockStart: 0, overflowY: 'auto' })}
      icon={<IconCable size="32" />}
      title={title}
      actions={
        <HStack gap="75">
          <OutlineButton Icon={IconPlayArrow} onClick={() => goToTest(currentWorkflowId)}>
            Test workflow
          </OutlineButton>
          {areWorkflowPreferencesEnabled && <IconButton Icon={IconSettings} onClick={() => setPanelOpen(true)} />}
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
      {isPanelOpen && <WorkflowSettingsSidePanel />}
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
