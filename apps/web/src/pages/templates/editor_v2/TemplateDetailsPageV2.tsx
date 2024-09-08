import { Button, IconButton } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow, IconSave, IconSettings } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { WorkflowsPageTemplate } from '../../../studio/components/workflows/layout';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';
import { WorkflowFloatingMenu } from '../../../studio/components/workflows/node-view/WorkflowFloatingMenu';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { parseUrl } from '../../../utils/routeUtils';
import { useTemplateController } from '../components/useTemplateController';
import { CloudWorkflowSettingsSidePanel } from './CloudWorkflowSettingsSidePanel';
import { useWorkflowDetailPageForm } from './useWorkflowDetailPageForm';

export const TemplateDetailsPageV2 = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const track = useTelemetry();
  const { template: workflow } = useTemplateController(templateId);
  const areWorkflowPreferencesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED);

  const { submitWorkflow, isSubmitting, hasChanges } = useWorkflowDetailPageForm({ templateId, workflow });

  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);

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
    <form name="workflow-form" noValidate onSubmit={submitWorkflow}>
      <WorkflowsPageTemplate
        className={css({ p: 0, paddingBlockStart: 0, overflowY: 'auto' })}
        icon={<IconCable size="32" />}
        title={title}
        actions={
          <HStack gap="75">
            {areWorkflowPreferencesEnabled && (
              <Button type={'submit'} disabled={!hasChanges} Icon={IconSave} loading={isSubmitting}>
                Save
              </Button>
            )}
            <OutlineButton Icon={IconPlayArrow} onClick={handleTestClick}>
              Test workflow
            </OutlineButton>
            {areWorkflowPreferencesEnabled && <IconButton Icon={IconSettings} onClick={() => setPanelOpen(true)} />}
          </HStack>
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
        {isPanelOpen && <CloudWorkflowSettingsSidePanel onClose={() => setPanelOpen(false)} />}
      </WorkflowsPageTemplate>
    </form>
  );
};
