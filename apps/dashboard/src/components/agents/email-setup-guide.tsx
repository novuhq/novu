import { EmailProviderIdEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiInformation2Fill, RiKey2Line, RiLoader4Line, RiMailSendLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { type AgentIntegrationLink, type AgentResponse, sendAgentTestEmail } from '@/api/agents';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { InboundAddressConfig } from './inbound-address-config';
import { OutboundProviderSelect } from './outbound-provider-select';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { type ConfiguredAddress, useEmailSetupCredentials } from './use-email-setup-credentials';

function resolveTestEmailTarget(
  customTarget: ConfiguredAddress | undefined,
  sharedInboundAddress: string | undefined,
  hasSharedInbox: boolean
): string | undefined {
  if (customTarget) {
    if (customTarget.address === '*') {
      return `test@${customTarget.domain}`;
    }

    return `${customTarget.address}@${customTarget.domain}`;
  }

  if (hasSharedInbox) {
    return sharedInboundAddress;
  }

  return undefined;
}

export type EmailSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
  /**
   * Optional agent–integration link, populated by callers that already have
   * it. When present, the wizard counts the Novu shared inbox as a valid
   * inbound address and uses it as the test-email target if no custom-domain
   * routes are configured. When absent (legacy callers), the wizard falls
   * back to the previous behavior of requiring a custom address.
   */
  integrationLink?: AgentIntegrationLink;
};

export function EmailSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
  integrationLink,
}: EmailSetupGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();

  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [testConnected, setTestConnected] = useState(false);

  const emailIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent),
    [integrations, integrationId]
  );

  const {
    outboundId,
    configuredAddresses,
    domains,
    isOutboundDemo,
    needsCredentialsStep,
    hasOutboundCredentials,
    outboundProviderConfig,
    onOutboundSelect,
    addAddress,
    removeAddress,
  } = useEmailSetupCredentials({ emailIntegration, integrations, agent });

  /**
   * Cloud-provisioned shared inbox address for this agent (e.g.
   * `support-agent-x@agentconnect.sh`). Pulled from the link payload because
   * computing it client-side would require the `NOVU_AGENT_SHARED_INBOUND_DOMAIN`
   * env var, which is server-only.
   */
  const sharedInboundAddress = integrationLink?.integration?.sharedInboundAddress;
  const sharedInboxDisabled = Boolean(integrationLink?.integration?.sharedInboxDisabled);
  const hasSharedInbox = Boolean(sharedInboundAddress) && !sharedInboxDisabled;

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const customTarget = configuredAddresses[0];
      const targetAddress = resolveTestEmailTarget(customTarget, sharedInboundAddress, hasSharedInbox);
      if (!targetAddress) throw new Error('No inbound address configured.');
      await sendAgentTestEmail(environment, agent.identifier, targetAddress);
    },
    onSuccess: () => showSuccessToast('Test email sent.'),
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not send test email.';
      showErrorToast(message, 'Test email failed');
    },
  });

  // Step indices — credentials step is conditionally inserted
  const base = stepOffset;
  const credentialsStepIndex = base + 1;
  const inboundStepIndex = needsCredentialsStep ? base + 2 : base + 1;
  const testStepIndex = inboundStepIndex + 1;

  // The Novu shared inbox satisfies the "configure inbound address" step out
  // of the box on cloud; users can still add custom-domain routes for branded
  // delivery, but they're no longer a hard prerequisite.
  const hasAddresses = configuredAddresses.length > 0 || hasSharedInbox;

  // The "Setup providers to send emails" step starts complete: the agent
  // already has the Novu demo sender selected by default, and choosing a real
  // provider is an explicit upgrade rather than a prerequisite. For demo,
  // `needsCredentialsStep` stays false so the credentials step is skipped
  // naturally and the wizard advances straight to the inbound-address step.
  const firstIncompleteStep = useMemo(() => {
    if (needsCredentialsStep && !hasOutboundCredentials) return credentialsStepIndex;
    if (!hasAddresses) return inboundStepIndex;
    if (!testConnected) return testStepIndex;

    return testStepIndex + 1;
  }, [
    needsCredentialsStep,
    hasOutboundCredentials,
    credentialsStepIndex,
    hasAddresses,
    inboundStepIndex,
    testStepIndex,
    testConnected,
  ]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        sectionLabel="SETUP SENDING EMAILS"
        title="Send emails via"
        description={
          <span>
            {'The Novu Email demo sender is selected by default. Switch to your own provider for higher volume. '}
            <Link to={ROUTES.INTEGRATIONS} className="text-text-sub underline underline-offset-2">
              Manage email providers
            </Link>
          </span>
        }
        rightContent={
          <div className="flex w-full flex-col gap-1.5">
            <OutboundProviderSelect selectedId={outboundId || undefined} onSelect={onOutboundSelect} />
            {isOutboundDemo ? <DemoProviderHint /> : null}
          </div>
        }
      />

      {needsCredentialsStep && (
        <SetupStep
          index={credentialsStepIndex}
          status={deriveStepStatus(credentialsStepIndex, firstIncompleteStep)}
          title={`Configure ${outboundProviderConfig?.displayName ?? 'provider'} credentials`}
          description={
            <span>
              {'Paste API keys or credentials from your email provider into the integration. '}
              {outboundProviderConfig?.docReference && (
                <a
                  href={outboundProviderConfig.docReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-sub underline"
                >
                  View setup guide
                </a>
              )}
            </span>
          }
          rightContent={
            <SetupButton
              leadingIcon={<RiKey2Line className="size-3.5" />}
              onClick={() => setIsCredentialsSidebarOpen(true)}
            >
              Configure credentials
            </SetupButton>
          }
        />
      )}

      <SetupStep
        index={inboundStepIndex}
        status={deriveStepStatus(inboundStepIndex, firstIncompleteStep)}
        sectionLabel="SETUP RECEIVING EMAILS"
        title="Configure inbound addresses"
        description="Add one or more email addresses across different domains. Subscribers send emails to these addresses to talk to your agent."
        rightContent={
          <InboundAddressConfig
            configuredAddresses={configuredAddresses}
            domains={domains}
            onAddAddress={addAddress}
            onRemoveAddress={removeAddress}
          />
        }
      />

      <SetupStep
        index={testStepIndex}
        status={deriveStepStatus(testStepIndex, firstIncompleteStep)}
        title="Test connection"
        description="Send a test email to verify the full inbound pipeline reaches your agent."
        rightContent={
          <SetupButton
            leadingIcon={
              testEmailMutation.isPending ? (
                <RiLoader4Line className="size-3.5 animate-spin" />
              ) : (
                <RiMailSendLine className="size-3.5" />
              )
            }
            disabled={firstIncompleteStep < testStepIndex || testEmailMutation.isPending}
            onClick={() => testEmailMutation.mutate()}
          >
            {testEmailMutation.isPending ? 'Sending...' : 'Send test email'}
          </SetupButton>
        }
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={() => {
        setTestConnected(true);
        onStepsCompleted?.();
      }}
      connectedMessage="Your email integration is connected. This agent is ready to receive emails."
      listeningMessage="Send a test email to verify the inbound pipeline reaches your agent."
    />
  );

  const credentialsSidebar =
    outboundId && needsCredentialsStep ? (
      <IntegrationCredentialsSidebar
        integrationId={outboundId}
        isOpen={isCredentialsSidebarOpen}
        onClose={() => setIsCredentialsSidebarOpen(false)}
        agentOnboarding
      />
    ) : null;

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <div className={cn('relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6')}>
          <div
            className="absolute bottom-0 left-[22px] top-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
            }}
          />
          {stepsColumn}
        </div>
        {listening}
        {credentialsSidebar}
      </div>
    );
  }

  return (
    <>
      {stepsColumn}
      {listening}
      {credentialsSidebar}
    </>
  );
}

function DemoProviderHint() {
  return (
    <div className="bg-bg-weak border-stroke-weak text-text-sub flex items-start gap-2 rounded-md border px-2 py-1.5">
      <RiInformation2Fill className="text-away-base mt-px size-3.5 shrink-0" aria-hidden />
      <p className="text-paragraph-xs leading-4">
        The demo sender is rate-limited and intended for testing only. Connect SendGrid, Resend, or another provider to
        send at scale.
      </p>
    </div>
  );
}
