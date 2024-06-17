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
import { useQuery } from '@tanstack/react-query';
import { WorkflowsPageTemplate } from '../../../studio/components/workflows/layout';
import { useTemplateController } from '../components/useTemplateController';
import { parseUrl } from '../../../utils/routeUtils';
import { StepNode } from '../../../studio/components/workflows/node-view/StepNode';
import { ROUTES } from '../../../constants/routes';
import { WorkflowFloatingMenu } from '../../../studio/components/workflows/node-view/WorkflowFloatingMenu';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';

export const TemplateEditorPageV2 = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();

  const { template: workflow } = useTemplateController(templateId);

  const title = workflow?.name || '';
  const navigate = useNavigate();

  const handleSettingsClick = () => {};
  const handleTestClick = () => {
    // navigate(ROUTES.STUDIO_FLOWS_TEST);
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
      <Flex
        // TODO fix this
        h="[95%]"
        justifyContent="center"
        className={css({
          // FIXME: popover token isn't correct. Also, ideally there should be a better way to use a token here
          backgroundImage: '[radial-gradient(var(--nv-colors-workflow-background-dots) 1.5px, transparent 0)]',
          backgroundSize: '[16px 16px]',
          p: '375',
          mx: '-150',
        })}
      >
        <WorkflowNodes
          steps={
            workflow?.steps?.map((item) => {
              return {
                stepId: item.stepId,
                type: item.template?.type,
              };
            }) || []
          }
          onClick={(step) => {
            navigate(
              parseUrl(ROUTES.WORKFLOWS_V2_STEP_EDIT, {
                templateId: workflow?._id as string,
                stepId: step.stepId,
              })
            );
          }}
        />
      </Flex>
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
