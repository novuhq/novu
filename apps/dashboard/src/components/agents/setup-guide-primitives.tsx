import { providers as novuProviders } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { createPortal } from 'react-dom';
import { RiArrowRightUpLine } from 'react-icons/ri';
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
import { cn } from '@/utils/ui';
import type { StepStatus } from './setup-guide-step-utils';

function StepIndicator({ status, index }: { status: StepStatus; index: number }) {
  if (status === 'completed') {
    return (
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-success-dark bg-success-base shadow-[0px_0px_0px_1px_hsl(var(--static-white)),0px_0px_0px_2px_hsl(var(--stroke-soft))]">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-bg-weak text-text-strong flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-medium leading-[10px] shadow-[0px_0px_0px_1px_#FFF,0px_0px_0px_2px_#E1E4EA]">
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
}: {
  index: number;
  status: StepStatus;
  sectionLabel?: string;
  title: string;
  description: ReactNode;
  rightContent?: ReactNode;
  extraContent?: ReactNode;
}) {
  return (
    <div className="relative flex gap-5 pl-6">
      <div className={cn('absolute -left-[20px] flex w-5 justify-center', sectionLabel ? 'top-5' : 'top-0')}>
        <StepIndicator status={status} index={index} />
      </div>
      <div className="flex w-[400px] shrink-0 flex-col pr-12">
        <div className="flex flex-col gap-2">
          {sectionLabel && (
            <p className="text-text-soft font-code text-[12px] font-medium leading-4 tracking-[-0.24px]">
              {sectionLabel}
            </p>
          )}
          <p className="text-text-strong text-label-sm font-medium leading-5">{title}</p>
          <div className="text-text-soft text-label-xs font-medium leading-4">{description}</div>
        </div>
        {extraContent}
      </div>
      {rightContent && <div className="flex min-h-0 min-w-0 flex-1 flex-col items-start">{rightContent}</div>}
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

export function ListeningStatus({
  agentIdentifier,
  watchedIntegrationId,
  onConnected,
  connectedMessage,
  listeningMessage,
}: {
  agentIdentifier: string;
  watchedIntegrationId: string | undefined;
  onConnected?: () => void;
  connectedMessage: string;
  listeningMessage: string;
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
      <div className="flex flex-col gap-2 py-4 pl-8">
        <div className="flex flex-col gap-3">
          {connectedAt ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="text-success-base size-3.5 shrink-0" />
              <span className="text-text-strong text-label-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Loader className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
              <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
                Listening...
              </span>
            </div>
          )}
          <p className="text-text-soft text-label-xs font-medium leading-4">
            {connectedAt ? connectedMessage : listeningMessage}
          </p>
        </div>
        <ExternalLink href="https://docs.novu.co/agents/overview" variant="documentation">
          Learn more in docs
        </ExternalLink>
      </div>
    </>
  );
}

export function IntegrationCredentialsSidebar({
  integrationId,
  isOpen,
  onClose,
  onSaveSuccess,
}: {
  integrationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}) {
  const { integrations } = useFetchIntegrations();
  const { mutateAsync: updateIntegration, isPending: isUpdating } = useUpdateIntegration();
  const [formState, setFormState] = useState({ isValid: true, errors: {} as Record<string, unknown>, isDirty: false });

  const integration = integrations?.find((i) => i._id === integrationId);
  const provider = novuProviders?.find((p) => p.id === integration?.providerId);

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
          Save Changes
        </Button>
      </div>
    </IntegrationSheet>
  );
}
