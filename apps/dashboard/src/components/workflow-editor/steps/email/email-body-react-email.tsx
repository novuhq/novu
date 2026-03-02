import { useReactEmailPolling } from '@/hooks/use-react-email-polling';
import { ResourceOriginEnum } from '@/utils/enums';
import { useWorkflow } from '../../workflow-provider';
import { CustomStepControls } from '../controls/custom-step-controls';
import { ReactEmailNotPublished } from './react-email-not-published';

export const EmailBodyReactEmail = () => {
  const { step, workflow } = useWorkflow();

  useReactEmailPolling({ stepResolverHash: step?.stepResolverHash });

  if (!step?.stepResolverHash) {
    return <ReactEmailNotPublished workflowId={workflow?.workflowId ?? ''} stepId={step?.stepId ?? ''} />;
  }

  // Step executes remotely via a deployed Cloudflare Worker — treat as EXTERNAL to show the override toggle UI.
  return (
    <div className="h-full overflow-y-auto bg-[#fbfbfb]">
      <CustomStepControls dataSchema={step?.controls.dataSchema} origin={ResourceOriginEnum.EXTERNAL} />
    </div>
  );
};
