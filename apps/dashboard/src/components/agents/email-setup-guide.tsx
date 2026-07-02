import { EmailProviderIdEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiInformation2Line, RiKey2Line, RiLoader4Line, RiMailSendLine } from 'react-icons/ri';
import { type AgentIntegrationLink, type AgentResponse, sendAgentTestEmail } from '@/api/agents';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { IS_SELF_HOSTED_EE } from '@/config';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { InboundAddressConfig } from './inbound-address-config';
import { OutboundProviderSelect } from './outbound-provider-select';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  SetupButton,
  SetupStep,
  SetupStepperRail,
} from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { SharedInboundAddressField } from './shared-inbound-address-field';
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
  /** Onboarding hides the custom-address add-form; the shared inbox is enough to get started. */
  isOnboarding?: boolean;
};

export function EmailSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
  integrationLink,
  isOnboarding = false,
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
  const isManagedAgent = agent.runtime === 'managed';

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
  // Self-hosted Enterprise has no bundled Novu demo sender, so a freshly
  // provisioned agent has no outbound provider selected. Treat picking one as a
  // hard prerequisite there. On cloud the demo is selected by default, so this
  // branch never fires and the step stays pre-completed exactly as before (zero
  // behavioral delta).
  const needsOutboundSelection = IS_SELF_HOSTED_EE && !outboundId;

  const firstIncompleteStep = useMemo(() => {
    if (needsOutboundSelection) return base;
    if (needsCredentialsStep && !hasOutboundCredentials) return credentialsStepIndex;
    if (!hasAddresses) return inboundStepIndex;
    if (!testConnected) return testStepIndex;

    return testStepIndex + 1;
  }, [
    needsOutboundSelection,
    base,
    needsCredentialsStep,
    hasOutboundCredentials,
    credentialsStepIndex,
    hasAddresses,
    inboundStepIndex,
    testStepIndex,
    testConnected,
  ]);

  const showInboundAddressOnTestStep = isOnboarding && hasSharedInbox && sharedInboundAddress;

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        sectionLabel="SETUP SENDING EMAILS"
        title="Setup providers to send emails."
        description={
          IS_SELF_HOSTED_EE
            ? 'Select an email provider (e.g. SendGrid, SES, Resend) so your agent can send replies.'
            : 'The Novu Email demo sender is used by default so your agent can reply out of the box. Switch to your own provider for higher volume later.'
        }
        rightContent={
          <div className="flex w-full flex-col gap-1.5">
            <div className="text-text-strong text-label-xs flex items-center gap-1 font-medium leading-4">
              <span>Send emails via</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="More info" className="inline-flex">
                    <RiInformation2Line className="text-text-soft size-3.5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Select the email provider you want to use to send emails.
                </TooltipContent>
              </Tooltip>
            </div>
            <OutboundProviderSelect selectedId={outboundId || undefined} onSelect={onOutboundSelect} hideLabel />
            <div className="flex items-center gap-1">
              <RiInformation2Line className="text-text-soft size-3.5" aria-hidden />
              <span className="text-text-soft text-label-xs font-normal leading-4">
                You can setup other providers later.{' '}
              </span>
            </div>
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
        title="Configure inbound address"
        description={
          showInboundAddressOnTestStep
            ? 'Your agent receives email on a dedicated inbound address. Custom domains and providers can be configured later.'
            : 'You can talk to your agent via this mail address. Override the address to send from another email. Reply-To always routes back to the agent so replies stay in the thread.'
        }
        extraContent={
          showInboundAddressOnTestStep ? undefined : (
            <InboundAddressConfig
              sharedInboundAddress={hasSharedInbox ? sharedInboundAddress : undefined}
              configuredAddresses={configuredAddresses}
              domains={domains}
              onAddAddress={addAddress}
              onRemoveAddress={removeAddress}
              hideCustomAddressForm={isOnboarding}
            />
          )
        }
      />

      <SetupStep
        index={testStepIndex}
        status={deriveStepStatus(testStepIndex, firstIncompleteStep)}
        title="Test connection"
        description={
          isManagedAgent
            ? 'Send an email to your configured inbound address. We will detect when it arrives.'
            : 'Send an email to your configured inbound address and verify it reaches your agent handler.'
        }
        extraContent={
          <div className="flex w-full flex-col gap-4">
            {showInboundAddressOnTestStep ? (
              <SharedInboundAddressField sharedInboundAddress={sharedInboundAddress} />
            ) : null}
            <ListeningStatus
              inline
              agentIdentifier={agent.identifier}
              watchedIntegrationId={integrationId}
              onConnected={() => {
                setTestConnected(true);
                onStepsCompleted?.();
              }}
              connectedMessage="Your email integration is connected. This agent is ready to receive emails."
              listeningMessage={
                isManagedAgent
                  ? 'Waiting for your email — send a message to your configured inbound address.'
                  : 'Send a test email to verify the inbound pipeline reaches your agent.'
              }
            />
          </div>
        }
        rightContent={
          isManagedAgent ? undefined : (
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
          )
        }
      />
    </>
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
        <SetupStepperRail className="py-6 pb-3 pr-3 md:pr-6">{stepsColumn}</SetupStepperRail>
        {credentialsSidebar}
      </div>
    );
  }

  return (
    <>
      <SetupStepperRail>{stepsColumn}</SetupStepperRail>
      {credentialsSidebar}
    </>
  );
}
