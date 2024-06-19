import { Button, IconButton } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow, IconSettings } from '@novu/novui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkflowsPageTemplate } from '../../../studio/components/workflows/layout';
import { useTemplateController } from '../components/useTemplateController';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes';
import { WorkflowFloatingMenu } from '../../../studio/components/workflows/node-view/WorkflowFloatingMenu';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';

export const TemplateDetailsPageV2 = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();

  const { template: workflow } = useTemplateController(templateId);

  const title = workflow?.name || '';
  const navigate = useNavigate();

  const handleSettingsClick = () => {};
  const handleTestClick = () => {
    navigate(parseUrl(ROUTES.STUDIO_FLOWS_TEST, { templateId: (workflow as any)?.rawData?.workflowId }));
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
