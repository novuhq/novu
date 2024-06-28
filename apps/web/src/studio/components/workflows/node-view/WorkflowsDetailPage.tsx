import { Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow } from '@novu/novui/icons';
import { useWorkflow } from '../../../hooks/useBridgeAPI';
import { useStudioWorkflowsNavigation } from '../../../hooks/useStudioWorkflowsNavigation';
import { WorkflowsPageTemplate } from '../layout/WorkflowsPageTemplate';
import { WorkflowBackgroundWrapper } from './WorkflowBackgroundWrapper';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';
import { WorkflowNodes } from './WorkflowNodes';

export const WorkflowsDetailPage = () => {
  const { currentWorkflowId, goToStep, goToTest } = useStudioWorkflowsNavigation();
  const { data: workflow } = useWorkflow(currentWorkflowId);

  const title = workflow?.workflowId;

  return (
    <WorkflowsPageTemplate
      icon={<IconCable size="32" />}
      title={title}
      actions={
        <>
          <Button Icon={IconPlayArrow} variant="outline" onClick={() => goToTest(currentWorkflowId)}>
            Test workflow
          </Button>
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
