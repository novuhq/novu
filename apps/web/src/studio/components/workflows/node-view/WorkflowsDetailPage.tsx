import { Button, IconButton } from '@novu/novui';
import { css } from '@novu/novui/css';
import {
  IconCable,
  IconOutlineBolt,
  IconOutlineEmail,
  IconOutlineNotifications,
  IconPlayArrow,
  IconSettings,
  IconOutlineAutoAwesomeMotion,
  IconOutlineAvTimer,
  IconOutlineForum,
  IconOutlineMobileFriendly,
  IconOutlineSms,
} from '@novu/novui/icons';
import { Flex, VStack } from '@novu/novui/jsx';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes';
import { WorkflowsPageTemplate } from '../layout/WorkflowsPageTemplate';
import { StepNode } from './StepNode';
import { WorkflowFloatingMenu } from './WorkflowFloatingMenu';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { parseUrl } from '../../../../utils/routeUtils';
import { WorkflowNodes } from './WorkflowNodes';
import { WorkflowBackgroundWrapper } from './WorkflowBackgroundWrapper';

export const WorkflowsDetailPage = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();

  const { data: workflow, isLoading } = useQuery(['workflow', templateId], async () => {
    return bridgeApi.getWorkflow(templateId);
  });

  const title = workflow?.workflowId;
  const navigate = useNavigate();

  const handleSettingsClick = () => {};
  const handleTestClick = () => {
    navigate(parseUrl(ROUTES.STUDIO_FLOWS_TEST, { templateId }));
  };

  return (
    <WorkflowsPageTemplate
      icon={<IconCable size="32" />}
      title={title}
      actions={
        <>
          <Button Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
            Test workflow
          </Button>
          <IconButton Icon={IconSettings} onClick={handleSettingsClick} />
        </>
      }
    >
      <WorkflowBackgroundWrapper>
        <WorkflowNodes
          steps={workflow?.steps || []}
          onClick={(step) => {
            // TODO: this is just a temporary step for connecting the prototype
            navigate(
              parseUrl(ROUTES.STUDIO_FLOWS_STEP_EDITOR, {
                templateId: workflow.workflowId,
                stepId: step.stepId,
              })
            );
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
