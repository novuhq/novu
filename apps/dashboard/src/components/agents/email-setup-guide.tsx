import { EmailProviderIdEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiKey2Line, RiLoader4Line, RiMailSendLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { type AgentResponse, sendAgentTestEmail } from '@/api/agents';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { InboundAddressConfig } from './inbound-address-config';
import { OutboundProviderSelect } from './outbound-provider-select';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { useEmailSetupCredentials } from './use-email-setup-credentials';

export type EmailSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

export function EmailSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
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

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const first = configuredAddresses[0];
      if (!first) throw new Error('No inbound address configured.');
      const targetAddress = first.address === '*' ? `test@${first.domain}` : `${first.address}@${first.domain}`;
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

  const hasAddresses = configuredAddresses.length > 0;

  const firstIncompleteStep = useMemo(() => {
    if (!outboundId) return base;
    if (needsCredentialsStep && !hasOutboundCredentials) return credentialsStepIndex;
    if (!hasAddresses) return inboundStepIndex;
    if (!testConnected) return testStepIndex;

    return testStepIndex + 1;
  }, [base, outboundId, needsCredentialsStep, hasOutboundCredentials, credentialsStepIndex, hasAddresses, inboundStepIndex, testStepIndex, testConnected]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        sectionLabel="SETUP SENDING EMAILS"
        title="Setup providers to send emails"
        description={
          <span>
            {'Choose which email provider sends outbound replies from your agent. '}
            <Link to={ROUTES.INTEGRATIONS} className="text-text-sub underline underline-offset-2">
              Manage email providers
            </Link>
          </span>
        }
        rightContent={<OutboundProviderSelect selectedId={outboundId || undefined} onSelect={onOutboundSelect} />}
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
      />
    ) : null;

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <div className={cn('relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6')}>
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
