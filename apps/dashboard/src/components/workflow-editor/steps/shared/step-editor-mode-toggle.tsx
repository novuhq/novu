import {
  ApiServiceLevelEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  UNLIMITED_VALUE,
} from '@novu/shared';
import { ArrowRight, Check, DraftingCompass, FileCode2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Badge } from '@/components/primitives/badge';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useDisconnectStepResolver } from '@/hooks/use-disconnect-step-resolver';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useStepResolversCount } from '@/hooks/use-step-resolvers-count';
import { useTelemetry } from '@/hooks/use-telemetry';
import { STEP_RESOLVER_SUPPORTED_STEP_TYPES, TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';

export function StepEditorModeToggle() {
  const { step, workflow, isPendingResolverActivation, setIsPendingResolverActivation } = useStepEditor();
  const { currentEnvironment, readOnly } = useEnvironment();
  const { disconnectStepResolver, isPending: isDisconnecting } = useDisconnectStepResolver();
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);
  const { subscription, isLoading: isSubscriptionLoading } = useFetchSubscription();
  const { data: stepResolversCountData, isLoading: isCountLoading } = useStepResolversCount();
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const telemetry = useTelemetry();

  if (
    !isStepResolverEnabled ||
    !STEP_RESOLVER_SUPPORTED_STEP_TYPES.includes(step.type) ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV ||
    readOnly
  ) {
    return null;
  }

  const tier = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  const codeStepLimit = getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MAX_STEP_RESOLVERS, tier, false);
  const isUnlimited = codeStepLimit >= UNLIMITED_VALUE;
  const stepResolversCount = stepResolversCountData?.count;
  const isAtCodeStepLimit =
    !IS_SELF_HOSTED &&
    !isSubscriptionLoading &&
    !isCountLoading &&
    !isUnlimited &&
    !step.stepResolverHash &&
    !isPendingResolverActivation &&
    stepResolversCount !== undefined &&
    stepResolversCount >= codeStepLimit;

  const codeStepLimitDescription =
    tier === ApiServiceLevelEnum.FREE
      ? `You've reached the ${codeStepLimit} code step limit on your Free plan. Upgrade to Pro for 10 code steps, or Business for unlimited.`
      : `You've reached the ${codeStepLimit} code step limit on your ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan. Upgrade to Business for unlimited code steps.`;

  const isActive = Boolean(step.stepResolverHash);
  const isCodeMode = isActive || isPendingResolverActivation;

  const handleToggle = (checked: boolean) => {
    if (checked && isAtCodeStepLimit) {
      return;
    }

    if (checked) {
      telemetry(TelemetryEvent.STEP_RESOLVER_CUSTOM_CODE_CLICKED, {
        stepType: step.type,
        stepId: step.stepId,
        workflowId: workflow.workflowId,
      });
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
        description="This will disconnect your custom code step and restore native editing for this step."
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

        <Switch
          checked={isCodeMode}
          onCheckedChange={handleToggle}
          disabled={isDisconnecting || (isAtCodeStepLimit && !isCodeMode)}
        />

        {isAtCodeStepLimit && !isCodeMode ? (
          <UpgradeCTATooltip description={codeStepLimitDescription} utmCampaign="code_steps_limit">
            <span className="inline-flex cursor-not-allowed">
              <button
                type="button"
                disabled
                className="flex cursor-not-allowed items-center gap-0.5 rounded border border-stroke-weak bg-bg-weak px-1 py-0.5 text-text-sub opacity-60"
              >
                <FileCode2 className="size-3" />
                <span className="text-code-xs">CUSTOM CODE</span>
                <Badge variant="lighter" color="purple" size="sm">
                  New
                </Badge>
              </button>
            </span>
          </UpgradeCTATooltip>
        ) : (
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
                <span className=" ml-1 mr-0.5 inline-flex shrink-0 items-center">
                  <span aria-hidden className="size-1 rounded-full bg-purple-500/35 ring-1 ring-purple-alpha-10" />
                  <span className="sr-only">New</span>
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              variant="light"
              side="bottom"
              align="end"
              className="w-[340px] overflow-hidden border-stroke-weak p-0 shadow-[0px_12px_24px_0px_rgba(14,18,27,0.06),0px_1px_2px_0px_rgba(14,18,27,0.03)]"
            >
              <div className="flex items-center gap-1.5 border-b border-stroke-weak bg-bg-weak px-2 py-1.5">
                <FileCode2 className="size-3 shrink-0 text-text-strong" />
                <span className="text-label-xs text-text-strong">Manage this step in your code</span>
                <Badge variant="lighter" color="gray" size="sm">
                  BETA
                </Badge>
              </div>
              <div className="flex flex-col gap-3 px-2 py-2">
                <p className="text-paragraph-xs text-text-sub">
                  Write and deploy this step as a serverless function from your repository.
                </p>
                <ul className="flex flex-col gap-1.5">
                  {(TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(step.type)
                    ? [
                        { label: 'Use any template engine', detail: 'React Email, MJML...' },
                        { label: 'Code-first', detail: 'define content and logic in TypeScript' },
                        { label: 'Version controlled', detail: 'your handler lives in your repo' },
                      ]
                    : [
                        {
                          label: 'Override step logic in TypeScript',
                          detail: 'custom delay, digest, or routing rules',
                        },
                        { label: 'Code-first', detail: 'define behavior and conditions in your repo' },
                        { label: 'Version controlled', detail: 'your handler lives in your codebase' },
                      ]
                  ).map(({ label, detail }) => (
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
                  href="https://docs.novu.co/platform/workflow/add-and-configure-steps/code-steps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-label-xs text-text-strong hover:underline"
                >
                  Learn more
                  <ArrowRight className="size-3" />
                </a>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
  );
}
