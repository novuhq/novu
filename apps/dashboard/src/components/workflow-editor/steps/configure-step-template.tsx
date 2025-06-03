import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { StepDrawer } from './step-drawer';
import { ConfigureStepTemplateForm } from './configure-step-template-form';

export const ConfigureStepTemplate = () => {
  const { workflow, update, step } = useWorkflow();
  const isV2TemplateEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED);

  if (!workflow || !step) {
    return null;
  }

  // If V2 is enabled, don't render the drawer since the full-page editor will be shown
  if (isV2TemplateEditorEnabled) {
    return null;
  }

  return (
    <StepDrawer title={`Edit ${step?.name}`}>
      <ConfigureStepTemplateForm workflow={workflow} step={step} update={update} />
    </StepDrawer>
  );
};
