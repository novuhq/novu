import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { StepDrawer } from './step-drawer';
import { ConfigureStepTemplateForm } from './configure-step-template-form';

export const ConfigureStepTemplate = () => {
  const { workflow, update, step } = useWorkflow();

  if (!workflow || !step) {
    return null;
  }

  return (
    <StepDrawer title={`Edit ${step?.name}`}>
      <ConfigureStepTemplateForm workflow={workflow} step={step} update={update} />
    </StepDrawer>
  );
};
