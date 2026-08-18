import { useEffect } from 'react';
import { ConfigureStepForm } from '@/components/workflow-editor/steps/configure-step-form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';

const loadEditStepTemplateV2Page = () => import('@/pages/edit-step-template-v2');

export const ConfigureStep = () => {
  const { workflow, step, update } = useWorkflow();
  const { currentEnvironment } = useEnvironment();

  useEffect(() => {
    void loadEditStepTemplateV2Page();
  }, []);

  if (!currentEnvironment || !step || !workflow) {
    return null;
  }

  return (
    <ConfigureStepForm
      key={`${workflow.workflowId}-${step.stepId}`}
      workflow={workflow}
      step={step}
      environment={currentEnvironment}
      update={update}
    />
  );
};
