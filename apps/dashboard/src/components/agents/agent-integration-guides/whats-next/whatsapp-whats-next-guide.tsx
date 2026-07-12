import { ChatProviderIdEnum } from '@novu/shared';
import { type ReactNode, useMemo, useState } from 'react';
import { RiArrowRightUpLine, RiExpandUpDownLine, RiKey2Line } from 'react-icons/ri';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useInSessionMilestone } from '@/hooks/use-in-session-milestone';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { useWhatsNextGuideSession } from '@/hooks/use-whats-next-default-expanded';
import { shouldShowWhatsNextGuide } from '@/utils/whats-next-guide';
import { SetupGuideCard } from '../../setup-guide-card';
import {
  CompletedStepIndicator,
  IntegrationCredentialsSidebar,
  SetupButton,
  SetupStep,
} from '../../setup-guide-primitives';
import type { StepStatus } from '../../setup-guide-step-utils';

const WHATSAPP_MANAGER_URL = 'https://business.facebook.com/wa/manage';
const META_APP_DASHBOARD_URL = 'https://developers.facebook.com/apps/';
const BUSINESS_VERIFICATION_HELP_URL = 'https://www.facebook.com/business/help/2058515294227817';
const META_SYSTEM_USERS_URL = 'https://business.facebook.com/settings/system-users';

const quietLinkClassName =
  'text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors';

type WhatsAppWhatsNextGuideProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  /** True when the integration connected during this session (expanded on first view). */
  justConnected?: boolean;
};

type GuideStep = {
  key: string;
  status: StepStatus;
  sectionLabel?: string;
  title: ReactNode;
  description: ReactNode;
  rightContent?: ReactNode;
  extraContent?: ReactNode;
};

function ConnectedBadge() {
  return (
    <span className="bg-success-lighter flex items-center gap-1 rounded-md px-1 py-0.5">
      <span className="flex size-4 items-center justify-center rounded-full bg-success-lighter">
        <span className="bg-success-base size-1.5 rounded-full" />
      </span>
      <span className="text-success-base text-label-xs font-medium leading-4">Connected</span>
    </span>
  );
}

function RecapToggleRow({ count, isExpanded, onToggle }: { count: number; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="relative flex flex-col gap-4 pl-6">
      <div className="absolute -left-[20px] top-[3px] flex w-5 justify-center">
        <CompletedStepIndicator />
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="text-text-sub hover:text-text-strong flex items-center gap-0.5 self-start transition-colors"
      >
        <span className="text-label-xs font-medium">
          {isExpanded ? 'Hide instructions' : `Show all ${count} instructions`}
        </span>
        <RiExpandUpDownLine className="size-4" />
      </button>
    </div>
  );
}

function StepRow({ step, index }: { step: GuideStep; index: number }) {
  return (
    <SetupStep
      index={index}
      status={step.status}
      sectionLabel={step.sectionLabel}
      inlineSectionLabel
      title={step.title}
      description={step.description}
      rightContent={step.rightContent}
      extraContent={step.extraContent}
    />
  );
}

function ProductionReadyFooter({ ready }: { ready: boolean }) {
  const message = ready
    ? 'Your agent is production-ready. Your users can message it on WhatsApp with a permanent token.'
    : 'Complete the steps above to finish Meta production setup and swap in a permanent System User token.';

  return (
    <div className="py-4 pl-8">
      <p className="text-text-soft text-label-xs font-medium leading-4">{message}</p>
    </div>
  );
}

function ExternalMetaLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={quietLinkClassName}>
      <span>{children}</span>
      <RiArrowRightUpLine className="size-3.5" aria-hidden />
    </a>
  );
}

export function WhatsAppWhatsNextGuide({ agent, integrationLink, justConnected = false }: WhatsAppWhatsNextGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const { isFreshSession } = useWhatsNextGuideSession(justConnected);
  const persistKey = `agent-integration-whats-next:${currentEnvironment?.slug ?? ''}:${agent.identifier}:${integrationLink.integration.identifier}`;
  const { integrations, isLoading: isIntegrationsLoading } = useFetchIntegrations();
  const { mutateAsync: updateIntegration, isPending: isConfirmingStamp } = useUpdateIntegration();
  const integrationId = integrationLink.integration._id;

  const whatsappIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.WhatsAppBusiness),
    [integrations, integrationId]
  );

  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isRecapExpanded, setIsRecapExpanded] = useState(false);

  const completedAt = whatsappIntegration?.credentials.whatsNextCompletedAt ?? null;
  const productionReady = Boolean(completedAt);
  const justProductionReady = useInSessionMilestone(productionReady, {
    ready: !isIntegrationsLoading && Boolean(whatsappIntegration),
    persistKey: `${persistKey}:layer2`,
  });

  if (!whatsappIntegration) {
    return null;
  }

  if (!shouldShowWhatsNextGuide(completedAt, { isFreshSession })) {
    return null;
  }

  const recapSteps: Array<{ title: string; description: string }> = [
    {
      title: 'Meta app created',
      description: 'Business-type app with WhatsApp product added in the Meta App Dashboard.',
    },
    {
      title: 'API credentials saved',
      description: 'Access Token, Phone Number ID, WABA ID, and App Secret saved on this integration.',
    },
    {
      title: 'Connection tested',
      description: 'Webhook registered and a test message confirmed the agent receives WhatsApp.',
    },
  ];

  async function handleConfirmPermanentToken() {
    if (!whatsappIntegration || completedAt || isConfirmingStamp) {
      return;
    }

    // Stamp-only patch — never re-spread client credentials. List payloads can omit or
    // mask secrets; UpdateIntegration replaces the credentials document, so echoing them
    // would wipe apiToken. Server-side ensureWhatsAppManagedCredentials merges over existing.
    try {
      await updateIntegration({
        integrationId: whatsappIntegration._id,
        data: {
          name: whatsappIntegration.name,
          identifier: whatsappIntegration.identifier,
          active: whatsappIntegration.active !== false,
          primary: whatsappIntegration.primary ?? false,
          credentials: {
            whatsNextCompletedAt: new Date().toISOString(),
          },
          configurations: {},
          check: false,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not confirm permanent token.';
      showErrorToast(message, 'Settings not saved');
    }
  }

  const metaProductionStep: GuideStep = {
    key: 'meta-production',
    status: 'current',
    title: 'Finalize production onboarding in Meta',
    description: (
      <div className="flex flex-col gap-2">
        <p>Before you go live, finish Meta&apos;s production setup for this WhatsApp Business account.</p>
        <ol className="list-inside list-decimal space-y-1.5">
          <li>
            <strong className="text-text-sub">Register a production WhatsApp phone number</strong>
            {' — replace the Meta test number with a real business number in '}
            <a
              href={WHATSAPP_MANAGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              WhatsApp Manager
            </a>
            .
          </li>
          <li>
            <strong className="text-text-sub">Add a payment method</strong>
            {
              ' — required before Meta sends business-initiated (template) messages; 24h service-window replies work without it.'
            }
          </li>
          <li>
            <strong className="text-text-sub">Switch your app to Live</strong>
            {' — in the '}
            <a
              href={META_APP_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              Meta App Dashboard
            </a>
            {', move out of Development mode.'}
          </li>
          <li>
            <strong className="text-text-sub">Verify your business (recommended)</strong>
            {
              ' — optional per Meta; shows display name, raises limits, protects the account. Review ~2–10 business days ('
            }
            <a
              href={BUSINESS_VERIFICATION_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              help
            </a>
            ).
          </li>
        </ol>
      </div>
    ),
    rightContent: (
      <div className="flex flex-col gap-1.5">
        <ExternalMetaLink href={WHATSAPP_MANAGER_URL}>WhatsApp Manager</ExternalMetaLink>
        <ExternalMetaLink href={META_APP_DASHBOARD_URL}>Meta App Dashboard</ExternalMetaLink>
        <ExternalMetaLink href={BUSINESS_VERIFICATION_HELP_URL}>Business verification help</ExternalMetaLink>
      </div>
    ),
  };

  const permanentTokenStep: GuideStep = {
    key: 'permanent-token',
    status: productionReady ? 'completed' : 'current',
    sectionLabel: 'GO PRODUCTION',
    title: 'Use a never-expiring System User token',
    description: (
      <div className="flex flex-col gap-2">
        <ol className="list-inside list-decimal space-y-1">
          <li>
            {'In '}
            <a
              href={META_SYSTEM_USERS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              Business Settings → System Users
            </a>
            {', create an '}
            <strong className="text-text-sub">Admin</strong>
            {' system user'}
          </li>
          <li>{'Assign Assets — Full Control over the App + WhatsApp Business Account'}</li>
          <li>
            {'Generate New Token — '}
            <strong className="text-text-sub">Never expires</strong>
            {'; scopes '}
            <code className="text-text-sub">whatsapp_business_messaging</code>
            {' + '}
            <code className="text-text-sub">whatsapp_business_management</code>
          </li>
          <li>
            {'Paste into '}
            <strong className="text-text-sub">Access Token</strong>
            {' via the button (leave Phone Number ID / WABA ID / App Secret alone unless they changed)'}
          </li>
        </ol>
      </div>
    ),
    rightContent: (
      <div className="flex w-full flex-col gap-1.5">
        <SetupButton
          leadingIcon={<RiKey2Line className="size-3.5" />}
          onClick={() => setIsCredentialsSidebarOpen(true)}
        >
          Update access token
        </SetupButton>
        {!productionReady ? (
          <button
            type="button"
            disabled={isConfirmingStamp}
            onClick={() => {
              void handleConfirmPermanentToken();
            }}
            className="text-text-sub hover:text-text-strong disabled:text-text-disabled self-start text-label-xs font-medium leading-4 transition-colors disabled:cursor-not-allowed"
          >
            I&apos;ve already set a permanent token
          </button>
        ) : null}
      </div>
    ),
  };

  const recapCount = recapSteps.length;
  const devSteps = [metaProductionStep, permanentTokenStep];

  return (
    <>
      <ConnectionConfetti active={justProductionReady} />
      <SetupGuideCard
        label="What's next"
        rightContent={productionReady ? <ConnectedBadge /> : null}
        persistKey={persistKey}
      >
        <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6">
          <div
            className="absolute bottom-0 left-[22px] top-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
            }}
          />
          <RecapToggleRow
            count={recapCount}
            isExpanded={isRecapExpanded}
            onToggle={() => setIsRecapExpanded((prev) => !prev)}
          />
          {isRecapExpanded
            ? recapSteps.map((step, i) => (
                <StepRow
                  key={`recap-${step.title}`}
                  step={{ key: `recap-${i}`, status: 'completed', title: step.title, description: step.description }}
                  index={i + 1}
                />
              ))
            : null}
          {devSteps.map((step, i) => {
            const index = isRecapExpanded ? recapCount + 1 + i : i + 1;

            return <StepRow key={step.key} step={step} index={index} />;
          })}
        </div>
        <ProductionReadyFooter ready={productionReady} />
        <IntegrationCredentialsSidebar
          integrationId={integrationId}
          isOpen={isCredentialsSidebarOpen}
          onClose={() => setIsCredentialsSidebarOpen(false)}
          agentOnboarding
        />
      </SetupGuideCard>
    </>
  );
}
