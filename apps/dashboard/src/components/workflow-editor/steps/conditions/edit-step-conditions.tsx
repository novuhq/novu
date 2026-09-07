import { ResourceOriginEnum } from '@novu/shared';
import { RiCloseLine, RiGuideFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

import { CompactButton } from '@/components/primitives/button-compact';
import { EditStepConditionsForm } from '@/components/workflow-editor/steps/conditions/edit-step-conditions-form';
import { EditStepConditionsFormSkeleton } from '@/components/workflow-editor/steps/conditions/edit-step-conditions-skeleton';
import { StepDrawer } from '@/components/workflow-editor/steps/step-drawer';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

export const EditStepConditions = () => {
  const navigate = useNavigate();
  const { isPending, workflow, step } = useWorkflow();

  if (!workflow || !step) {
    return null;
  }

  const { uiSchema } = step.controls ?? {};
  const { skip } = uiSchema?.properties ?? {};

  if (!skip || workflow.origin !== ResourceOriginEnum.NOVU_CLOUD) {
    navigate('..', { relative: 'path' });
    return null;
  }

  return (
    <StepDrawer title={`Edit ${step?.name} Conditions`} maxWidth="sm:max-w-[800px]">
      <header className="flex h-12 w-full flex-row items-center justify-between gap-3 border-b py-4 pl-3 pr-3">
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
