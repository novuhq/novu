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
import { useEffect, useState } from 'react';
import { Button, Input } from '@novu/novui';
import { useMutation } from '@tanstack/react-query';
import { createTemplate, createTemplateV2 } from '../../../api/notification-templates';

export const TemplateDetailsPageV2 = ({ create = false }: { create?: boolean }) => {
  const [workflowData, setWorkflowData] = useState<{ steps: any[]; _id: string }>({ steps: [], _id: '' });
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

  const { isLoading: isCreating, mutateAsync: createNotificationTemplate } = useMutation((data) =>
    createTemplateV2(data as any)
  );

  async function handleSave() {
    await createNotificationTemplate(workflowData as any);
  }

  useEffect(() => {
    track('Workflow open - [Studio]', {
      workflowId: workflow?.name,
      env: 'cloud',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorkflowsPageTemplate
      icon={<IconCable size="32" />}
      title={
        !create ? (
          title
        ) : (
          <Input
            placeholder="Enter title"
            onChange={(e) => {
              setWorkflowData((prev) => ({
                ...prev,
                name: e.target.value,
                _id: e.target.value,
              }));
            }}
          />
        )
      }
      actions={
        <>
          <Button
            onClick={() => {
              handleSave();
            }}
          >
            Save
          </Button>

          <OutlineButton Icon={IconPlayArrow} onClick={handleTestClick}>
            Test workflow
          </OutlineButton>
        </>
      }
    >
      <WorkflowBackgroundWrapper className={workflowBackgroundWrapperClass}>
        {!create ? (
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
              console.log({ workflowData });
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
        ) : (
          <WorkflowNodes
            steps={
              workflowData?.steps?.map((item) => {
                return {
                  stepId: item.stepId,
                  type: item.template?.type,
                };
              }) || []
            }
            onStepClick={(step) => {
              navigate(
                parseUrl(ROUTES.WORKFLOWS_V2_STEP_EDIT, {
                  templateId: workflowData?._id as string,
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
        )}
      </WorkflowBackgroundWrapper>

      <WorkflowFloatingMenu
        create={create as boolean}
        onCreate={(channel: any) => {
          setWorkflowData((prev) => ({
            ...prev,
            steps: [
              ...prev.steps,
              {
                stepId: channel,
                template: {
                  type: channel,
                },
              },
            ],
          }));
        }}
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
