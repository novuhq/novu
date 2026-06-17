import { ChatProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowRightUpLine, RiCheckLine, RiKey2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { InlineToast } from '@/components/primitives/inline-toast';
import { isWhatsAppEmbeddedSignupConfigured } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  SetupButton,
  SetupStep,
} from './setup-guide-primitives';
import { deriveStepStatus, hasWhatsAppUserCredentials } from './setup-guide-step-utils';
import { ConnectAndTestPanel } from './whatsapp-connect-and-test-panel';
import { EmbeddedSignupInboundTestPanel } from './whatsapp-embedded-signup-inbound-test-panel';
import { WhatsAppEmbeddedSignupButton } from './whatsapp-embedded-signup-button';
import { buildAgentWebhookUrl } from './whatsapp-setup-guide-utils';

export type WhatsAppSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

export function WhatsAppSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: WhatsAppSetupGuideProps) {
  const { subscriberId: connectSubscriberId, isReady: isConnectSubscriberReady } = useConnectSubscriber();
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [credentialsSavedLocally, setCredentialsSavedLocally] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [useManualCredentialsFlow, setUseManualCredentialsFlow] = useState(false);
  const isEmbeddedSignupFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED, false);
  const showEmbeddedSignupFlow =
    isEmbeddedSignupFlagEnabled && isWhatsAppEmbeddedSignupConfigured() && !useManualCredentialsFlow;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
    setCredentialsSavedLocally(false);
    setUseManualCredentialsFlow(false);
  }, [integrationId]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const handleEmbeddedSignupSuccess = useCallback(() => {
    setCredentialsSavedLocally(true);
  }, []);

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.WhatsAppBusiness),
    [integrations, integrationId]
  );

  const selectedIntegrationIdentifier = selectedIntegration?.identifier ?? '';
  const hasCredentials = hasWhatsAppUserCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;
  const embeddedListeningMessage =
    isCredentialsSaved && !isConnected
      ? "Send a message to your WhatsApp business number — we'll confirm as soon as it arrives."
      : 'Waiting for Meta to confirm the webhook subscription…';

  const verifyToken = (selectedIntegration?.credentials?.token as string | undefined) ?? '';
  const webhookUrl = buildAgentWebhookUrl(agent._id, selectedIntegrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER');

  const base = stepOffset;
  const completionStep = showEmbeddedSignupFlow ? base + 2 : base + 3;

  const firstIncompleteStep = useMemo(() => {
    if (isConnected) {
      return completionStep;
    }

    if (!isCredentialsSaved) {
      return showEmbeddedSignupFlow ? base : base + 1;
    }

    return showEmbeddedSignupFlow ? base + 1 : base + 2;
  }, [base, completionStep, isConnected, isCredentialsSaved, showEmbeddedSignupFlow]);

  const embeddedSignupSteps = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Connect your WhatsApp Business account"
        description={
          <span>
            {
              "Click Log in with Facebook to share your WhatsApp Business account with Novu. We'll save your credentials and register the webhook automatically."
            }
          </span>
        }
        rightContent={
          <div className="flex flex-col gap-2">
            {isCredentialsSaved ? (
              <div className="text-success-base flex items-center gap-1.5">
                <RiCheckLine className="size-4" />
                <span className="text-label-xs font-medium">WhatsApp Business account connected</span>
              </div>
            ) : (
              <>
                {isConnectSubscriberReady && selectedIntegrationIdentifier ? (
                  <WhatsAppEmbeddedSignupButton
                    agentIdentifier={agent.identifier}
                    integrationIdentifier={selectedIntegrationIdentifier}
                    onSuccess={handleEmbeddedSignupSuccess}
                  />
                ) : null}
                <button
                  type="button"
                  className="text-text-sub hover:text-text-strong text-label-xs w-fit font-medium underline"
                  onClick={() => setUseManualCredentialsFlow(true)}
                >
                  Enter credentials manually instead
                </button>
              </>
            )}
          </div>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Send a test message"
        description={
          isCredentialsSaved
            ? "Save your phone number, then open WhatsApp and send any message to your business number. Novu confirms the connection as soon as it arrives."
            : "Complete WhatsApp Embedded Signup above first, then save your phone number and send a test message."
        }
        rightContent={
          isConnectSubscriberReady && isCredentialsSaved && selectedIntegration?.credentials ? (
            <EmbeddedSignupInboundTestPanel
              connectSubscriberId={connectSubscriberId}
              credentials={selectedIntegration.credentials}
            />
          ) : null
        }
      />
    </>
  );

  const manualSetupSteps = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Create a Meta app"
        description={
          <span>
            {'Open the '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              Meta App Dashboard
            </a>
            {' and click '}
            <strong className="text-text-sub">Create App</strong>
            {'. Select the '}
            <strong className="text-text-sub">Connect with customers through WhatsApp</strong>
            {' use case, then pick or create a business portfolio.'}
          </span>
        }
        rightContent={
          <SetupButton
            href="https://developers.facebook.com/apps/"
            leadingIcon={
              <ProviderIcon
                providerId={ChatProviderIdEnum.WhatsAppBusiness}
                providerDisplayName="WhatsApp Business"
                className="size-4 shrink-0"
              />
            }
          >
            Meta App Dashboard
          </SetupButton>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Get your API credentials and save them in Novu"
        description={
          <span>
            {'In the left sidebar of your Meta app open '}
            <strong className="text-text-sub">Use cases</strong>
            {', click '}
            <strong className="text-text-sub">Customize</strong>
            {' on "Connect with customers through WhatsApp", then pick '}
            <strong className="text-text-sub">API Setup</strong>
            {
              " from the inner menu. CMD+A and CMD+C the whole page and paste it in the configure sidebar — we'll auto-fill:"
            }
          </span>
        }
        extraContent={
          <ol className="text-text-soft text-label-xs mt-1.5 list-inside list-decimal space-y-0.5 font-medium leading-4">
            <li>
              <strong className="text-text-sub">Access Token</strong> — click &ldquo;Generate access token&rdquo; on the
              API Setup page
            </li>
            <li>
              <strong className="text-text-sub">Phone Number ID</strong> — shown under your selected phone number on the
              API Setup page
            </li>
            <li>
              <strong className="text-text-sub">WhatsApp Business Account ID</strong> — shown directly above the Phone
              Number ID on the API Setup page
            </li>
            <li>
              <strong className="text-text-sub">App Secret</strong> — lives on a different page; open{' '}
              <strong className="text-text-sub">App settings &gt; Basic</strong> from the bottom of the left sidebar,
              then copy the value next to <strong className="text-text-sub">App secret</strong> and paste it manually
            </li>
          </ol>
        }
        rightContent={
          <div className="flex flex-col gap-3">
            <SetupButton
              leadingIcon={<RiKey2Line className="size-3.5" />}
              onClick={() => setIsCredentialsSidebarOpen(true)}
            >
              {isCredentialsSaved ? 'Edit credentials' : 'Configure credentials'}
            </SetupButton>
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1"
            >
              <ProviderIcon
                providerId={ChatProviderIdEnum.WhatsAppBusiness}
                providerDisplayName="WhatsApp Business"
                className="size-4 shrink-0"
              />
              <span className="text-text-sub text-label-xs font-medium">Meta Developer Portal</span>
              <RiArrowRightUpLine className="text-text-sub size-3" />
            </a>
            {isCredentialsSaved ? (
              <p className="text-text-soft text-label-xs leading-4">
                Verify Token is auto-generated by Novu — no need to copy or paste it anywhere yourself.
              </p>
            ) : null}
          </div>
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Connect & test"
        description={
          isCredentialsSaved
            ? 'Click Connect WhatsApp — Novu will register the webhook with Meta and subscribe to inbound messages on your behalf.'
            : 'Save your credentials above first. Then come back here to register the webhook with Meta in one click.'
        }
        rightContent={
          isConnectSubscriberReady ? (
            <ConnectAndTestPanel
              agent={agent}
              integrationIdentifier={selectedIntegrationIdentifier}
              connectSubscriberId={connectSubscriberId}
              webhookUrl={webhookUrl}
              verifyToken={verifyToken}
              isCredentialsSaved={isCredentialsSaved && Boolean(selectedIntegrationIdentifier)}
              onConnected={handleConnected}
            />
          ) : null
        }
        extraContent={
          isConnected ? (
            <InlineToast
              className="mt-2 w-full"
              variant="tip"
              title="Heads up:"
              description="The token from API Setup expires after 24 hours. For production, swap it for a permanent System User Token in Meta Business Settings > System Users."
            />
          ) : null
        }
      />
    </>
  );

  const stepsColumn = showEmbeddedSignupFlow ? embeddedSignupSteps : manualSetupSteps;

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="WhatsApp is connected — your agent is ready to receive messages."
      listeningMessage={
        showEmbeddedSignupFlow ? embeddedListeningMessage : 'Waiting for Meta to confirm the webhook subscription…'
      }
    />
  );

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
        <IntegrationCredentialsSidebar
          integrationId={integrationId}
          isOpen={isCredentialsSidebarOpen}
          onClose={() => setIsCredentialsSidebarOpen(false)}
          onSaveSuccess={() => setCredentialsSavedLocally(true)}
          agentOnboarding
        />
      </div>
    );
  }

  return (
    <>
      {stepsColumn}
      {listening}
      <IntegrationCredentialsSidebar
        integrationId={integrationId}
        isOpen={isCredentialsSidebarOpen}
        onClose={() => setIsCredentialsSidebarOpen(false)}
        onSaveSuccess={() => setCredentialsSavedLocally(true)}
        agentOnboarding
      />
    </>
  );
}
