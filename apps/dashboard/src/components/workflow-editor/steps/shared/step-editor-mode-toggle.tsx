import { EnvironmentTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { ArrowRight, Check, DraftingCompass, FileCode2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useEnvironment } from '@/context/environment/hooks';
import { useDisconnectStepResolver } from '@/hooks/use-disconnect-step-resolver';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { cn } from '@/utils/ui';

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
  const isCodeMode = isActive || isPendingResolverActivation;

  const handleToggle = (checked: boolean) => {
    if (checked) {
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

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleToggle(false)}
          className={cn(
            'flex cursor-pointer items-center gap-0.5 rounded border px-1 py-0.5 transition-colors',
            isCodeMode
              ? 'border-stroke-weak bg-bg-weak text-text-sub hover:border-stroke-soft hover:bg-bg-white hover:text-text-strong'
              : 'border-stroke-soft bg-bg-white text-text-strong'
          )}
        >
          <DraftingCompass className="size-3" />
          <span className="text-code-xs">EDITOR</span>
        </button>

        <Switch checked={isCodeMode} onCheckedChange={handleToggle} />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => handleToggle(true)}
              className={cn(
                'flex cursor-pointer items-center gap-0.5 rounded border px-1 py-0.5 transition-colors',
                isCodeMode
                  ? 'border-stroke-soft bg-bg-white text-text-strong'
                  : 'border-stroke-weak bg-bg-weak text-text-sub hover:border-stroke-soft hover:bg-bg-white hover:text-text-strong'
              )}
            >
              <FileCode2 className="size-3" />
              <span className="text-code-xs">CUSTOM CODE</span>
            </button>
          </TooltipTrigger>
          <TooltipContent
            variant="light"
            side="bottom"
            align="end"
            className="w-[340px] overflow-hidden border-stroke-weak p-0 shadow-[0px_12px_24px_0px_rgba(14,18,27,0.06),0px_1px_2px_0px_rgba(14,18,27,0.03)]"
          >
            <div className="flex items-center gap-1 border-b border-stroke-weak bg-bg-weak px-2 py-1.5">
              <FileCode2 className="size-3 shrink-0 text-text-strong" />
              <span className="text-label-xs text-text-strong">Manage this step in your code</span>
            </div>
            <div className="flex flex-col gap-3 px-2 py-2">
              <p className="text-paragraph-xs text-text-sub">
                Write and deploy this step as a serverless function from your repository.
              </p>
              <ul className="flex flex-col gap-1.5">
                {[
                  { label: 'Use any template engine', detail: 'React Email, MJML...' },
                  { label: 'Code-first', detail: 'define content and logic in TypeScript' },
                  { label: 'Version controlled', detail: 'your handler lives in your repo' },
                ].map(({ label, detail }) => (
                  <li key={label} className="flex items-center gap-1">
                    <Check className="size-3 shrink-0 text-text-sub" />
                    <span className="text-paragraph-xs">
                      <span className="font-medium text-text-strong">{label}:</span>
                      <span className="text-text-sub"> {detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-stroke-weak bg-bg-weak px-2 py-1.5">
              <div className="flex items-center gap-1">
                <Check className="size-3 shrink-0 text-text-soft" />
                <span className="text-paragraph-xs text-text-soft">You can switch back anytime</span>
              </div>
              <a
                href="https://docs.novu.co/framework/overview"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-0.5 text-label-xs text-text-strong hover:underline"
              >
                Learn more
                <ArrowRight className="size-3" />
              </a>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
