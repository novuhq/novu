import { Step } from '@/components/primitives/step';
import { WorkflowStep } from '@/components/workflow-step';
import { StepTypeEnum } from '@novu/shared';

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
    <div className="flex items-center *:-ml-2 last-of-type:ml-0">
      <>
        {firstSteps.map((step) => (
          <WorkflowStep step={step} />
        ))}
        {restSteps.length > 1 && <Step>+{restSteps.length}</Step>}
      </>
    </div>
  );
};
