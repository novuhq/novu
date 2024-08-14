import { css, cx } from '@novu/novui/css';
import { IconCable, IconPlayArrow } from '@novu/novui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkflowsPageTemplate } from '../../../studio/components/workflows/layout';
import { useTemplateController } from '../components/useTemplateController';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes';
import { WorkflowFloatingMenu } from '../../../studio/components/workflows/node-view/WorkflowFloatingMenu';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { useEffect } from 'react';

export const TemplateDetailsPageV2 = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const track = useTelemetry();

  const { template: workflow } = useTemplateController(templateId);

  const title = workflow?.name || '';
  const navigate = useNavigate();

  const workflowBackgroundWrapperClass = css({
    mx: '0',
  });

  const handleTestClick = () => {
    navigate(parseUrl(ROUTES.WORKFLOWS_V2_TEST, { templateId }));
  };

  useEffect(() => {
    track('Workflow open - [Studio]', {
      workflowId: workflow?.name,
      env: 'cloud',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorkflowsPageTemplate
      className={css({ p: 0, paddingBlockStart: 0, overflowY: 'auto' })}
      icon={<IconCable size="32" />}
      title={title}
      actions={
        <>
          <OutlineButton Icon={IconPlayArrow} onClick={handleTestClick}>
            Test workflow
          </OutlineButton>
        </>
      }
    >
      <WorkflowBackgroundWrapper className={workflowBackgroundWrapperClass}>
        <WorkflowNodes
          steps={
            workflow?.steps?.map((item) => {
              return {
                stepId: item.stepId,
                type: item.template?.type,
              };
            }) || []
          }
          onStepClick={(step) => {
            navigate(
              parseUrl(ROUTES.WORKFLOWS_V2_STEP_EDIT, {
                templateId: workflow?._id as string,
                stepId: step.stepId,
              })
            );
          }}
          onTriggerClick={() => {
            navigate(
              parseUrl(ROUTES.WORKFLOWS_V2_TEST, {
                templateId: workflow?._id as string,
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
