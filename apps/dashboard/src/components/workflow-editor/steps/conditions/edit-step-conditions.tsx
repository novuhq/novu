import { RiCloseLine, RiGuideFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { FeatureFlagsKeysEnum, WorkflowOriginEnum } from '@novu/shared';

import { CompactButton } from '@/components/primitives/button-compact';
import { EditStepConditionsForm } from '@/components/workflow-editor/steps/conditions/edit-step-conditions-form';
import { EditStepConditionsFormSkeleton } from '@/components/workflow-editor/steps/conditions/edit-step-conditions-skeleton';
import { StepDrawer } from '@/components/workflow-editor/steps/step-drawer';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

export const EditStepConditions = () => {
  const navigate = useNavigate();
  const { isPending, workflow, step } = useWorkflow();
  const isStepConditionsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_CONDITIONS_ENABLED);

  if (!workflow || !step) {
    return null;
  }

  const { uiSchema } = step.controls ?? {};
  const { skip } = uiSchema?.properties ?? {};

  if (!isStepConditionsEnabled || !skip || workflow.origin !== WorkflowOriginEnum.NOVU_CLOUD) {
    navigate('..', { relative: 'path' });
    return null;
  }

  return (
    <StepDrawer title={`Edit ${step?.name} Conditions`}>
      <header className="flex flex-row items-center gap-3 border-b border-neutral-200 px-3 py-1.5">
        <div className="mr-auto flex items-center gap-2.5 py-2 text-sm font-medium">
          <RiGuideFill className="size-4" />
          <span>Step Conditions</span>
        </div>

        <CompactButton
          icon={RiCloseLine}
          variant="ghost"
          className="size-6"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('..', { relative: 'path' });
          }}
        >
          <span className="sr-only">Close</span>
        </CompactButton>
      </header>
      {isPending ? <EditStepConditionsFormSkeleton /> : <EditStepConditionsForm />}
    </StepDrawer>
  );
};
