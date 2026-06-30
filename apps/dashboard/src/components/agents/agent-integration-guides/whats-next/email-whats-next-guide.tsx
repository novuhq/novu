import { EmailProviderIdEnum } from '@novu/shared';
import { type ReactNode, useMemo, useState } from 'react';
import { RiArrowRightSLine, RiCloseLine, RiExpandUpDownLine, RiKey2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { IS_SELF_HOSTED_EE } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { CopyableEmailAddress } from '../../copyable-email-address';
import { InboundAddressForm } from '../../inbound-address-form';
import { isAgentIntegrationConnected } from '../../is-agent-integration-connected';
import { OutboundProviderSelect } from '../../outbound-provider-select';
import { SetupGuideCard } from '../../setup-guide-card';
import {
  CompletedStepIndicator,
  IntegrationCredentialsSidebar,
  SetupButton,
  SetupStep,
} from '../../setup-guide-primitives';
import type { StepStatus } from '../../setup-guide-step-utils';
import { useEmailSetupCredentials } from '../../use-email-setup-credentials';

const DELIVERABILITY_DOCS_URL = 'https://docs.novu.co/platform/domains';

type EmailWhatsNextGuideProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
};

type GuideStep = {
  key: string;
  status: StepStatus;
  sectionLabel?: string;
  title: ReactNode;
  description: ReactNode;
  rightContent?: ReactNode;
  extraContent?: ReactNode;
  fullWidthContent?: ReactNode;
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
      fullWidthContent={step.fullWidthContent}
    />
  );
}

function ProductionReadyFooter({ ready }: { ready: boolean }) {
  return (
    <div className="py-4 pl-8">
      <p className="text-text-soft text-label-xs font-medium leading-4">
        {ready
          ? 'Your agent is production-ready. Your users can email it on your own domain with full deliverability.'
          : 'Complete the steps above to graduate off the demo sender and make your agent production-ready.'}
      </p>
    </div>
  );
}

export function EmailWhatsNextGuide({ agent, integrationLink }: EmailWhatsNextGuideProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const integrationId = integrationLink.integration._id;

  const emailIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent),
    [integrations, integrationId]
  );

  const {
    outboundId,
    isOutboundDemo,
    needsCredentialsStep,
    hasOutboundCredentials,
    outboundProviderConfig,
    configuredAddresses,
    domains,
    onOutboundSelect,
    addAddress,
    removeAddress,
  } = useEmailSetupCredentials({ emailIntegration, integrations, agent });

  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isRecapExpanded, setIsRecapExpanded] = useState(false);

  const sharedInboundAddress = integrationLink.integration.sharedInboundAddress;

  const inboundAddresses = useMemo(
    () => configuredAddresses.map(({ address, domain }) => (address === '*' ? `*@${domain}` : `${address}@${domain}`)),
    [configuredAddresses]
  );

  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.DOMAINS;

  if (!emailIntegration) {
    return null;
  }

  const providerDone = !isOutboundDemo && hasOutboundCredentials;
  // A branded address can only be added on a verified domain (the picker only lists verified
  // domains with MX configured), so a configured address implies a verified, deliverable domain.
  const addressBranded = configuredAddresses.length > 0;
  // Cloud surfaces only the provider upgrade in "What's next" (custom domain + sharing move to the
  // EMAIL card below), so production-readiness keys off the provider alone. Self-hosted EE keeps the
  // full inline checklist and still requires a branded address.
  const isSelfHosted = IS_SELF_HOSTED_EE;
  const productionReady = isSelfHosted ? providerDone && addressBranded : providerDone;
  const primaryUserAddress = inboundAddresses[0] ?? sharedInboundAddress ?? undefined;

  const recapSteps: Array<{ title: string; description: string }> = [
    {
      title: 'Default sender ready',
      description: 'Your agent replies through the Novu demo sender out of the box (rate-limited, for testing).',
    },
    {
      title: 'Inbound address provisioned',
      description: 'Your agent receives email at its shared Novu inbox address.',
    },
    {
      title: 'Connection tested',
      description: 'You confirmed inbound email reaches your agent.',
    },
  ];

  const providerStep: GuideStep = {
    key: 'provider',
    status: providerDone ? 'completed' : 'current',
    sectionLabel: 'GO PRODUCTION',
    title: 'Send from your own email provider',
    description:
      'The demo sender is rate-limited and for testing only. Connect SendGrid, Resend, SES, or another provider for full volume and deliverability control.',
    rightContent: (
      <div className="flex w-full flex-col gap-1.5">
        <OutboundProviderSelect selectedId={outboundId || undefined} onSelect={onOutboundSelect} hideLabel />
        {needsCredentialsStep && !hasOutboundCredentials ? (
          <SetupButton
            leadingIcon={<RiKey2Line className="size-3.5" />}
            onClick={() => setIsCredentialsSidebarOpen(true)}
          >
            {`Configure ${outboundProviderConfig?.displayName ?? 'provider'} credentials`}
          </SetupButton>
        ) : null}
      </div>
    ),
  };

  // Self-hosted EE has no demo sender / shared inbox, so "What's next" stays the full production
  // checklist (custom domain + share address) inline. On cloud those move into the EMAIL card below,
  // so only the provider upgrade is shown here.
  const productionHardeningSteps: GuideStep[] = [
    {
      key: 'domain',
      status: addressBranded ? 'completed' : 'current',
      title: 'Connect a custom domain',
      description: (
        <span>
          {
            'Let users email your agent at a branded address on your own domain (e.g. support@yourcompany.com). Add the domain in Novu and configure DNS so inbound mail routes to your agent (MX) and your replies pass SPF, DKIM, and DMARC checks. '
          }
          <a
            href={DELIVERABILITY_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-sub underline"
          >
            Learn about deliverability
          </a>
        </span>
      ),
      extraContent: (
        <div className="flex w-full max-w-xl flex-col gap-3">
          {configuredAddresses.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {configuredAddresses.map((addr) => {
                const full = addr.address === '*' ? `*@${addr.domain}` : `${addr.address}@${addr.domain}`;

                return (
                  <div
                    key={`${addr.address}-${addr.domainId}`}
                    className="border-stroke-soft bg-bg-white flex items-center gap-2 rounded-lg border px-2 py-1.5 shadow-xs"
                  >
                    <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">{full}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${full}`}
                      className="text-text-soft hover:text-destructive"
                      onClick={() => removeAddress(addr.address, addr.domainId)}
                    >
                      <RiCloseLine className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
          <InboundAddressForm
            domains={domains}
            onSubmit={(address, domain) => {
              addAddress(address, domain);

              return true;
            }}
            isExistingAddress={(address, domainId) =>
              configuredAddresses.some((a) => a.address === address && a.domainId === domainId)
            }
          />
          <button
            type="button"
            onClick={() => navigate(domainsPath)}
            className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 self-start text-label-xs font-medium leading-4 transition-colors"
          >
            <span>Configure custom domains</span>
            <RiArrowRightSLine className="size-4" />
          </button>
        </div>
      ),
    },
    {
      key: 'users',
      status: 'current',
      sectionLabel: 'FOR YOUR USERS',
      title: "Share your agent's address",
      description:
        "Your users reach the agent by emailing its address. Drop it into your product's contact or reply flows, support footer, or docs — replies thread automatically.",
      extraContent: primaryUserAddress ? <CopyableEmailAddress email={primaryUserAddress} /> : undefined,
    },
  ];

  const devSteps: GuideStep[] = isSelfHosted ? [providerStep, ...productionHardeningSteps] : [providerStep];

  const recapCount = recapSteps.length;

  const credentialsSidebar =
    outboundId && needsCredentialsStep ? (
      <IntegrationCredentialsSidebar
        integrationId={outboundId}
        isOpen={isCredentialsSidebarOpen}
        onClose={() => setIsCredentialsSidebarOpen(false)}
        agentOnboarding
      />
    ) : null;

  return (
    <SetupGuideCard
      label="What's next"
      rightContent={isAgentIntegrationConnected(integrationLink) ? <ConnectedBadge /> : null}
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
      {credentialsSidebar}
    </SetupGuideCard>
  );
}
