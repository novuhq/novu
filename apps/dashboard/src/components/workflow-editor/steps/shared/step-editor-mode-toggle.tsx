import { EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useEnvironment } from '@/context/environment/hooks';
import { useDisconnectStepResolver } from '@/hooks/use-disconnect-step-resolver';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';

export function StepEditorModeToggle() {
  const { step, isPendingResolverActivation, setIsPendingResolverActivation } = useStepEditor();
  const { currentEnvironment, readOnly } = useEnvironment();
  const { disconnectStepResolver, isPending: isDisconnecting } = useDisconnectStepResolver();
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  if (
    !isStepResolverEnabled ||
    !TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(step.type) ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV ||
    readOnly
  ) {
    return null;
  }

  const isActive = Boolean(step.stepResolverHash);
  const mode = isActive || isPendingResolverActivation ? 'code' : 'novu';

  const handleValueChange = (value: string) => {
    if (value === mode) return;

    if (value === 'code') {
      setIsPendingResolverActivation(true);
    } else if (isActive) {
      setIsDisconnectModalOpen(true);
    } else {
      setIsPendingResolverActivation(false);
    }
  };

  return (
    <>
      <ConfirmationModal
        open={isDisconnectModalOpen}
        onOpenChange={setIsDisconnectModalOpen}
        onConfirm={async () => {
          try {
            await disconnectStepResolver({ stepInternalId: step._id, stepType: step.type });
          } catch (error) {
            console.error('Failed to disconnect step resolver', error);
          } finally {
            setIsPendingResolverActivation(false);
            setIsDisconnectModalOpen(false);
          }
        }}
        title="Switch back to Novu editor?"
        description="This will remove the link to your deployed step resolver and restore native editing for this step."
        confirmButtonText="Disconnect"
        isLoading={isDisconnecting}
      />

      <Tabs value={mode} onValueChange={handleValueChange}>
        <TabsList>
          <TabsTrigger value="novu" size="xs">
            Novu
          </TabsTrigger>
          <TabsTrigger value="code" size="xs">
            Code
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  );
}
