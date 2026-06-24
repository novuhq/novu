import { providers as novuProviders } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { createPortal } from 'react-dom';
import { RiArrowRightUpLine, RiFlashlightLine, RiListCheck2 } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
import { getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { IntegrationSettings } from '@/components/integrations/components/integration-settings';
import { IntegrationSheet } from '@/components/integrations/components/integration-sheet';
import { handleIntegrationError } from '@/components/integrations/components/utils/handle-integration-error';
import { cleanCredentials } from '@/components/integrations/components/utils/helpers';
import type { IntegrationFormData } from '@/components/integrations/types';
import { Button, buttonVariants } from '@/components/primitives/button';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { ExternalLink } from '@/components/shared/external-link';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { AGENTS_DOCS_PROVIDERS_URL } from '@/utils/agent-docs';
import { cn } from '@/utils/ui';
import type { StepStatus } from './setup-guide-step-utils';

export type SetupMode = 'quick' | 'manual';

export function SetupModeToggle({ mode, onChange }: { mode: SetupMode; onChange: (m: SetupMode) => void }) {
  return (
    <div className="inline-flex w-fit items-start gap-px rounded-[5px] bg-bg-weak p-px">
      <button
        type="button"
        aria-pressed={mode === 'quick'}
        onClick={() => onChange('quick')}
        className={cn(
          'flex items-center gap-1.5 rounded-[4px] py-1 pl-1.5 pr-2 text-label-xs font-medium transition-colors',
          mode === 'quick'
            ? 'bg-bg-white text-text-strong shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]'
            : 'text-text-sub hover:text-text-strong'
        )}
      >
        <RiFlashlightLine className="size-3.5" />
        Quick Setup
      </button>
      <button
        type="button"
        aria-pressed={mode === 'manual'}
        onClick={() => onChange('manual')}
        className={cn(
          'flex items-center gap-1.5 rounded-[4px] py-1 pl-1.5 pr-2 text-label-xs font-medium transition-colors',
          mode === 'manual'
            ? 'bg-bg-white text-text-strong shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]'
            : 'text-text-sub hover:text-text-strong'
        )}
      >
        <RiListCheck2 className="size-3.5" />
        Manual Setup
      </button>
    </div>
  );
}

export function CompletedStepIndicator() {
  return (
    <div className="bg-bg-weak flex size-5 shrink-0 items-center justify-center rounded-full shadow-[0px_0px_0px_2px_#FFF,0px_0px_0px_3px_#E1E4EA]">
      <div className="flex size-full items-center justify-center rounded-full border border-[#5ec269] bg-[#77db89] shadow-[inset_0px_-3px_0px_0px_#64ce6e]">
        <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
          <path d="M1.5 5.3125L3.5 7.8125L6.5 2.1875" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function StepIndicator({ status, index }: { status: StepStatus; index: number }) {
  if (status === 'completed') {
    return <CompletedStepIndicator />;
  }

  return (
    <div className="bg-bg-weak text-text-strong flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-medium leading-[10px] shadow-[0px_0px_0px_2px_#FFF,0px_0px_0px_3px_#E1E4EA]">
      {index}
    </div>
  );
}

export function SetupStep({
  index,
  status,
  sectionLabel,
  title,
  description,
  rightContent,
  extraContent,
  fullWidthContent,
  /**
   * Optional content rendered above the title block in the left column. Used for
   * step-level UI (e.g. segmented tabs) that should sit between the section label
   * and the title.
   */
  headerSlot,
  /**
   * Visually mutes a not-yet-reachable step (e.g. steps shown before credentials are saved) by
   * lowering opacity and disabling pointer interaction on its content.
   */
  dimmed,
  /**
   * Aligns the step indicator with the `sectionLabel` line instead of the title, so the number sits
   * inline with a short eyebrow (e.g. "FOR YOUR USERS"). Defaults to false to preserve the title
   * alignment used by numbered eyebrows like "1/5 SETUP AGENT HANDLER".
   */
  inlineSectionLabel,
}: {
  index: number;
  status: StepStatus;
  sectionLabel?: string;
  title: ReactNode;
  description: ReactNode;
  rightContent?: ReactNode;
  extraContent?: ReactNode;
  fullWidthContent?: ReactNode;
  headerSlot?: ReactNode;
  dimmed?: boolean;
  inlineSectionLabel?: boolean;
}) {
  let indicatorTopClass = 'top-[3px]';

  if (inlineSectionLabel) {
    indicatorTopClass = 'top-px';
  } else if (sectionLabel) {
    indicatorTopClass = 'top-6';
  }

  return (
    <div className="relative flex flex-col gap-4 pl-6">
      <div className={cn('absolute -left-[20px] flex w-5 justify-center', indicatorTopClass)}>
        <StepIndicator status={status} index={index} />
      </div>
      <div
        className={cn(
          'flex flex-col gap-4 transition-opacity duration-300 ease-out md:flex-row md:gap-20 pt-[3px]',
          dimmed && 'pointer-events-none opacity-30'
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            {sectionLabel && (
              <p className="text-text-soft text-code-xs font-normal leading-4 tracking-[-0.24px]">{sectionLabel}</p>
            )}
            {headerSlot}
            <p className={cn('text-label-sm font-medium leading-5 text-text-strong')}>{title}</p>
            <div className={cn('text-label-xs font-normal leading-4 text-text-soft')}>{description}</div>
          </div>
          {extraContent}
        </div>
        {rightContent && <div className="flex min-h-0 min-w-0 flex-1 flex-col items-start">{rightContent}</div>}
      </div>
      {fullWidthContent}
    </div>
  );
}

export function SetupButton({
  children,
  href,
  leadingIcon,
  onClick,
  disabled,
}: {
  children: ReactNode;
  href?: string;
  leadingIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  if (href) {
    const isDisabled = Boolean(disabled);

    return (
      <a
        href={isDisabled ? undefined : href}
        target={isDisabled ? undefined : '_blank'}
        rel={isDisabled ? undefined : 'noopener noreferrer'}
        className={buttonVariants({ variant: 'secondary', mode: 'outline', size: 'xs' }).root({
          class: cn(
            'relative flex items-center justify-center text-text-sub gap-1.5 px-2 py-1.5',
            'inline-flex w-fit max-w-full',
            isDisabled && 'pointer-events-none cursor-default opacity-50'
          ),
        })}
        aria-disabled={isDisabled ? true : undefined}
        tabIndex={isDisabled ? -1 : undefined}
      >
        {leadingIcon}
        <span className="text-label-xs inline-flex min-w-0 items-center font-medium">{children}</span>
        <RiArrowRightUpLine className="size-3 shrink-0" />
      </a>
    );
  }

  return (
    <Button
      variant="secondary"
      mode="outline"
      size="xs"
      className="text-text-sub gap-1.5 px-2 py-1.5"
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      {leadingIcon}
      <span className="text-label-xs inline-flex min-w-0 items-center font-medium">{children}</span>
    </Button>
  );
}

export function ListeningStatusView({
  connected,
  connectedTitle = 'Connected',
  listeningTitle = 'Listening...',
  connectedMessage,
  listeningMessage,
  inline = false,
  className,
  showStatusIndicator = true,
}: {
  connected: boolean;
  connectedTitle?: string;
  listeningTitle?: string;
  connectedMessage: string;
  listeningMessage: string;
  inline?: boolean;
  className?: string;
  showStatusIndicator?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-2', !inline && (className ?? 'py-4 pl-6'))}>
      <div className="flex flex-col gap-3">
        {showStatusIndicator ? (
          connected ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="text-success-base size-3.5 shrink-0" />
              <span className="text-text-strong text-label-sm font-medium">{connectedTitle}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Loader className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
              <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
                {listeningTitle}
              </span>
            </div>
          )
        ) : null}
        <p className="text-text-soft text-label-xs font-medium leading-4">
          {connected ? connectedMessage : listeningMessage}
        </p>
      </div>
      <ExternalLink href={AGENTS_DOCS_PROVIDERS_URL} variant="documentation">
        Learn more in docs
      </ExternalLink>
    </div>
  );
}

export function ListeningStatus({
  agentIdentifier,
  watchedIntegrationId,
  onConnected,
  connectedMessage,
  listeningMessage,
  inline = false,
}: {
  agentIdentifier: string;
  watchedIntegrationId: string | undefined;
  onConnected?: () => void;
  connectedMessage: string;
  listeningMessage: string;
  inline?: boolean;
}) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentEnvironment || !watchedIntegrationId) {
      return;
    }

    const environment = currentEnvironment;
    let cancelled = false;
    let confettiFired = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      if (cancelled) {
        return;
      }

      try {
        const res = await listAgentIntegrations({
          environment,
          agentIdentifier,
          limit: 100,
        });

        if (cancelled) {
          return;
        }

        const link = res.data.find((l) => l.integration._id === watchedIntegrationId);

        if (!link?.connectedAt) {
          return;
        }

        setConnectedAt(link.connectedAt);

        if (!confettiFired) {
          confettiFired = true;
          setShowConfetti(true);

          if (confettiTimeoutRef.current) {
            clearTimeout(confettiTimeoutRef.current);
          }

          confettiTimeoutRef.current = window.setTimeout(() => {
            confettiTimeoutRef.current = null;
            setShowConfetti(false);
          }, 10_000);
          onConnected?.();
        }

        queryClient.invalidateQueries({
          queryKey: getAgentIntegrationsQueryKey(environment._id, agentIdentifier),
        });

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        // ignore transient errors while polling
      }
    }

    void tick();
    intervalId = setInterval(() => void tick(), 1000);

    return () => {
      cancelled = true;

      if (intervalId) {
        clearInterval(intervalId);
      }

      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
        confettiTimeoutRef.current = null;
      }
    };
  }, [agentIdentifier, currentEnvironment, onConnected, queryClient, watchedIntegrationId]);

  return (
    <>
      {showConfetti &&
        createPortal(
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={1000}
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          />,
          document.body
        )}
      <ListeningStatusView
        connected={Boolean(connectedAt)}
        connectedMessage={connectedMessage}
        listeningMessage={listeningMessage}
        inline={inline}
      />
    </>
  );
}

export function IntegrationCredentialsSidebar({
  integrationId,
  isOpen,
  onClose,
  onSaveSuccess,
  agentOnboarding,
  agentIdentifier,
  testSubscriberId,
  submitLabel,
}: {
  integrationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  agentOnboarding?: boolean;
  /**
   * Agent identifier for agent-onboarding flows. Threaded through to
   * provider-specific paste components so they can render agent-scoped UI
   * (e.g. the Telegram mobile setup QR code) inside the modal.
   */
  agentIdentifier?: string;
  /** Quickstart test subscriber for Telegram mobile `/start` deep links. */
  testSubscriberId?: string | null;
  submitLabel?: string;
}) {
  const { integrations } = useFetchIntegrations();
  const { mutateAsync: updateIntegration, isPending: isUpdating } = useUpdateIntegration();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formState, setFormState] = useState({ isValid: true, errors: {} as Record<string, unknown>, isDirty: false });

  const integration = integrations?.find((i) => i._id === integrationId);
  const provider = novuProviders?.find((p) => p.id === integration?.providerId);

  useEffect(() => {
    if (!agentOnboarding) {
      return;
    }

    const hasAgentOnboardingParam = searchParams.get('agent_onboarding') === 'true';

    if ((isOpen && hasAgentOnboardingParam) || (!isOpen && !searchParams.has('agent_onboarding'))) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);

    if (isOpen) {
      nextSearchParams.set('agent_onboarding', 'true');
    } else {
      nextSearchParams.delete('agent_onboarding');
    }

    setSearchParams(nextSearchParams, { replace: true });
  }, [agentOnboarding, isOpen, searchParams, setSearchParams]);

  async function onSubmit(data: IntegrationFormData) {
    if (!integration) return;

    try {
      await updateIntegration({
        integrationId: integration._id,
        data: {
          name: data.name,
          identifier: data.identifier,
          active: data.active,
          primary: data.primary,
          credentials: cleanCredentials(data.credentials),
          check: data.check,
          configurations: data.configurations,
        },
      });

      showSuccessToast('Integration updated successfully');
      onSaveSuccess?.();
      onClose();
    } catch (error: unknown) {
      handleIntegrationError(error, 'update');
    }
  }

  if (!integration || !provider) return null;

  return (
    <IntegrationSheet isOpened={isOpen} onClose={onClose} provider={provider} mode="update">
      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <IntegrationSettings
          provider={provider}
          integration={integration}
          onSubmit={onSubmit}
          mode="update"
          agentOnboarding={agentOnboarding}
          agentIdentifier={agentIdentifier}
          testSubscriberId={testSubscriberId}
          onFormStateChange={setFormState}
        />
      </div>

      <div className="bg-background flex justify-end gap-2 border-t p-3">
        <Button
          type="submit"
          form={`integration-configuration-form-${provider.id}`}
          isLoading={isUpdating}
          disabled={!formState.isValid}
        >
          {submitLabel ?? 'Save Changes'}
        </Button>
      </div>
    </IntegrationSheet>
  );
}
