import { FeatureFlagsKeysEnum, ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { ChatEditor } from '@/components/workflow-editor/steps/chat/chat-editor';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { CustomStepControls } from '@/components/workflow-editor/steps/controls/custom-step-controls';
import { EmailEditor } from '@/components/workflow-editor/steps/email/email-editor';
import { HttpRequestEditor } from '@/components/workflow-editor/steps/http-request/http-request-editor';
import { InAppEditor } from '@/components/workflow-editor/steps/in-app/in-app-editor';
import { PushEditor } from '@/components/workflow-editor/steps/push/push-editor';
import { StepResolverActivePanel } from '@/components/workflow-editor/steps/shared/step-resolver-active-panel';
import { StepResolverNotPublished } from '@/components/workflow-editor/steps/shared/step-resolver-not-published';
import { SmsEditor } from '@/components/workflow-editor/steps/sms/sms-editor';
import { ThrottleEditor } from '@/components/workflow-editor/steps/throttle/throttle-editor';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useStepResolverPolling } from '@/hooks/use-step-resolver-polling';
import { INLINE_CONFIGURABLE_STEP_TYPES, STEP_RESOLVER_SUPPORTED_STEP_TYPES, STEP_TYPE_LABELS } from '@/utils/constants';

function NoEditorAvailable({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-neutral-500">{message}</div>;
}

export function StepEditorFactory() {
  const { workflow, step, isStepEditable, isPendingResolverActivation } = useStepEditor();
  const { refetch } = useWorkflow();
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);
  const isActionStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ACTION_STEP_RESOLVER_ENABLED);
  const { dataSchema, uiSchema } = step.controls || {};

  const onHashChange = useCallback(() => {
    refetch();
  }, [refetch]);

  const isActionStep = useMemo(() => INLINE_CONFIGURABLE_STEP_TYPES.includes(step.type), [step.type]);
  const isPollingFlagEnabled = isActionStep ? isActionStepResolverEnabled : isStepResolverEnabled;

  useStepResolverPolling({
    enabled: isPollingFlagEnabled && STEP_RESOLVER_SUPPORTED_STEP_TYPES.includes(step.type),
    stepResolverHash: step.stepResolverHash,
    onHashChange,
  });

  if (step.stepResolverHash) {
    return <StepResolverActivePanel />;
  }

  if (isPendingResolverActivation) {
    return <StepResolverNotPublished workflowId={step.workflowId} stepId={step.stepId} />;
  }

  if (!isStepEditable) {
    return <NoEditorAvailable message="No editor available for this step configuration" />;
  }

  if (workflow.origin === ResourceOriginEnum.EXTERNAL) {
    return <CustomStepControls dataSchema={dataSchema} origin={workflow.origin} />;
  }

  if (step.type === StepTypeEnum.HTTP_REQUEST) {
    if (!uiSchema) {
      return <NoEditorAvailable message="No editor configuration available" />;
    }

    return <HttpRequestEditor uiSchema={uiSchema} />;
  }

  if (!uiSchema) {
    return <NoEditorAvailable message="No editor configuration available" />;
  }

  switch (step.type) {
    case StepTypeEnum.EMAIL:
      return (
        <div className="border-soft-200 h-full overflow-hidden rounded-lg border shadow-lg">
          <EmailEditor uiSchema={uiSchema} isEditorV2={true} />
        </div>
      );

    case StepTypeEnum.IN_APP:
      return <InAppEditor uiSchema={uiSchema} />;

    case StepTypeEnum.SMS:
      return <SmsEditor uiSchema={uiSchema} />;

    case StepTypeEnum.PUSH:
      return <PushEditor uiSchema={uiSchema} />;

    case StepTypeEnum.CHAT:
      return <ChatEditor uiSchema={uiSchema} />;

    case StepTypeEnum.THROTTLE:
      return <ThrottleEditor />;

    default:
      return <NoEditorAvailable message={`Editor not implemented for ${STEP_TYPE_LABELS[step.type]} steps`} />;
  }
}
