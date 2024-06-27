import { Button, IconButton } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow, IconSettings } from '@novu/novui/icons';
import { useParams } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes';
import { WorkflowsPageTemplate } from '../layout/WorkflowsPageTemplate';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';
import { useWorkflow } from '../../../hooks/useBridgeAPI';
import { WorkflowNodes } from './WorkflowNodes';
import { WorkflowBackgroundWrapper } from './WorkflowBackgroundWrapper';
import { useStudioNavigate } from '../../../hooks/useStudioNavigate';

export const WorkflowsDetailPage = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const { data: workflow } = useWorkflow(templateId);

  const title = workflow?.workflowId;
  const navigate = useStudioNavigate();

  const handleSettingsClick = () => {};
  const handleTestClick = () => navigate(ROUTES.STUDIO_FLOWS_TEST, { templateId });

  return (
    <WorkflowsPageTemplate
      icon={<IconCable size="32" />}
      title={title}
      actions={
        <>
          <Button Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
            Test workflow
          </Button>
        </>
      }
    >
      <WorkflowBackgroundWrapper>
        <WorkflowNodes
          steps={workflow?.steps || []}
          onClick={(step) => {
            // TODO: this is just a temporary step for connecting the prototype
            navigate(ROUTES.STUDIO_FLOWS_STEP_EDITOR, {
              templateId: workflow.workflowId,
              stepId: step.stepId,
            });
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
