import { Step } from '@/components/primitives/step';
import { WorkflowStep } from '@/components/workflow-step';
import type { StepTypeEnum } from '@/utils/enums';

type WorkflowStepsProps = {
  steps: StepTypeEnum[];
};

export const WorkflowSteps = (props: WorkflowStepsProps) => {
  const { steps } = props;

  const sliceFactor = 4;
  let firstSteps: StepTypeEnum[] = [];
  let restSteps: StepTypeEnum[] = [];
  if (steps.length > sliceFactor) {
    firstSteps = steps.slice(0, sliceFactor - 1);
    restSteps = steps.slice(sliceFactor - 1);
  } else {
    firstSteps = steps;
  }

  return (
    <div className="flex items-center">
      <>
        {firstSteps.map((step) => (
          <WorkflowStep key={step} step={step} className="-ml-2 first-of-type:ml-0" />
        ))}
        {restSteps.length > 1 && <Step className="-ml-2">+{restSteps.length}</Step>}
      </>
    </div>
  );
};
