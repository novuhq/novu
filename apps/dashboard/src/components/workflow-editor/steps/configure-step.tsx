import { ConfigureStepForm } from '@/components/workflow-editor/steps/configure-step-form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';

export const ConfigureStep = () => {
  const { workflow, step, update } = useWorkflow();
  const { currentEnvironment } = useEnvironment();

  if (!currentEnvironment || !step || !workflow) {
    return null;
  }

  return <ConfigureStepForm workflow={workflow} step={step} environment={currentEnvironment} update={update} />;
};
