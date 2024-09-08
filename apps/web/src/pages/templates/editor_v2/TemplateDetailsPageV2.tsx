import { css } from '@novu/novui/css';
import { IconCable, IconPlayArrow, IconSave, IconSettings } from '@novu/novui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Button, IconButton } from '@novu/novui';
import { HStack } from '@novu/novui/jsx';
import { WorkflowsPageTemplate } from '../../../studio/components/workflows/layout';
import { useTemplateController } from '../components/useTemplateController';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes';
import { WorkflowFloatingMenu } from '../../../studio/components/workflows/node-view/WorkflowFloatingMenu';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { CloudWorkflowSettingsSidePanel } from './CloudWorkflowSettingsSidePanel';
import { SubmitHandler, useFormContext } from 'react-hook-form';
import { WorkflowDetailFormContext } from '../../../studio/components/workflows/preferences/WorkflowDetailFormContextProvider';
import { useUpdateWorkflowChannelPreferences } from '../../../hooks/workflowChannelPreferences/useUpdateWorkflowChannelPreferences';
import { useUpdateTemplate } from '../../../api/hooks';

export const TemplateDetailsPageV2 = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const track = useTelemetry();
  const areWorkflowPreferencesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED);

  const { formState, getValues, setValue, resetField, reset, handleSubmit } =
    useFormContext<WorkflowDetailFormContext>();

  const { updateWorkflowChannelPreferences, isLoading: isUpdatingPreferences } = useUpdateWorkflowChannelPreferences(
    templateId,
    () => {
      resetField('preferences');
    }
  );
  const { updateTemplateMutation, isLoading: isUpdatingGeneralSettings } = useUpdateTemplate({
    onSuccess: () => {
      resetField('general');
    },
  });

  const hasChanges = Object.keys(formState.dirtyFields).length > 0;

  const { template: workflow } = useTemplateController(templateId);

  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);

  useEffect(() => {
    if (workflow) {
      setValue('general', {
        workflowId: workflow.triggers?.[0]?.identifier ?? '',
        name: workflow.name,
        description: workflow.description,
      });
    }
  }, [workflow]);

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

  const onSubmit: SubmitHandler<WorkflowDetailFormContext> = ({ preferences, general }) => {
    if (formState.dirtyFields?.preferences) {
      updateWorkflowChannelPreferences(preferences);
    }

    if (formState.dirtyFields?.general) {
      const { workflowId, ...templateValues } = general;
      updateTemplateMutation({ id: templateId, data: { ...templateValues, identifier: workflowId } });
    }

    reset();
  };

  return (
    <form name="workflow-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <WorkflowsPageTemplate
        className={css({ p: 0, paddingBlockStart: 0, overflowY: 'auto' })}
        icon={<IconCable size="32" />}
        title={title}
        actions={
          <HStack gap="75">
            <Button
              type={'submit'}
              disabled={!hasChanges}
              Icon={IconSave}
              loading={isUpdatingPreferences || isUpdatingGeneralSettings}
            >
              Save
            </Button>
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
