import { ResourceOriginEnum } from '@/utils/enums';
import { useWorkflow } from '../../workflow-provider';
import { CustomStepControls } from '../controls/custom-step-controls';

export function StepResolverActivePanel() {
  const { step } = useWorkflow();

  if (!step?.stepResolverHash) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto">
      <CustomStepControls dataSchema={step.controls.dataSchema} origin={ResourceOriginEnum.EXTERNAL} />
    </div>
  );
}
