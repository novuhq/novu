import { ChatProviderIdEnum } from '@novu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCheckLine, RiLoader4Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useConfigurePhotonWebhook } from '@/hooks/use-configure-photon-webhook';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { usePhotonDeviceAuth } from '@/hooks/use-photon-device-auth';
import { useRemovePhotonWebhooks } from '@/hooks/use-remove-photon-webhooks';
import { ConnectWebhookPanel, StaleNovuWebhooksWarning } from './imessage-guide-panels';
import { ImessageIntegrationSelect } from './imessage-integration-select';
import { PhotonInboundTestPanel, type PhotonRecipientRegistration, PhotonRegisterPanel } from './photon-optin-panels';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  ProviderSetupStepperRail,
  ReadOnlyValueRow,
  SetupButton,
  SetupStep,
  SetupStepperRail,
} from './setup-guide-primitives';
import { deriveStepStatus, hasPhotonProjectCredentials } from './setup-guide-step-utils';

const PHOTON_DASHBOARD_URL = 'https://app.photon.codes';

const REGISTRATION_STORAGE_PREFIX = 'novu:photon-recipient:';

function readStoredRegistration(integrationId: string): PhotonRecipientRegistration | null {
  try {
    const raw = sessionStorage.getItem(`${REGISTRATION_STORAGE_PREFIX}${integrationId}`);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PhotonRecipientRegistration>;

    if (!parsed?.phoneNumber || !parsed?.assignedPhoneNumber) {
      return null;
    }

    return { phoneNumber: parsed.phoneNumber, assignedPhoneNumber: parsed.assignedPhoneNumber };
  } catch {
    return null;
  }
}

function writeStoredRegistration(integrationId: string, registration: PhotonRecipientRegistration | null) {
  const key = `${REGISTRATION_STORAGE_PREFIX}${integrationId}`;

  try {
    if (registration) {
      sessionStorage.setItem(key, JSON.stringify(registration));

      return;
    }

    sessionStorage.removeItem(key);
  } catch {
    // sessionStorage unavailable
  }
}

export type PhotonSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

function ConnectPhotonPanel({
  agent,
  integrationIdentifier,
  isCredentialsSaved,
  onOpenCredentials,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  isCredentialsSaved: boolean;
  onOpenCredentials: () => void;
}) {
  const { state, connect } = usePhotonDeviceAuth({
    agentIdentifier: agent.identifier,
    integrationIdentifier,
  });

  if (isCredentialsSaved && (state.phase === 'idle' || state.phase === 'complete')) {
    return (
      <div className="flex w-full max-w-[400px] flex-col gap-2">
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">Photon project connected</span>
        </div>
        {state.phase === 'complete' && state.warning ? (
          <InlineToast className="w-full" variant="warning" description={state.warning} />
        ) : null}
        <button
          type="button"
          onClick={onOpenCredentials}
          className="text-text-sub hover:text-text-strong w-fit text-label-xs font-medium underline"
        >
          Edit credentials
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      {state.phase === 'waiting' ? (
        <div className="border-stroke-weak bg-bg-weak flex w-full flex-col gap-3 rounded-lg border p-3">
          <p className="text-text-soft text-label-xs leading-4">
            Enter this code on the Photon verification page to approve the connection.
          </p>
          <ReadOnlyValueRow label="Verification code" value={state.userCode} />
          <SetupButton
            href={state.verificationUriComplete ?? state.verificationUri}
            leadingIcon={
              <ProviderIcon
                providerId={ChatProviderIdEnum.PhotonImessage}
                providerDisplayName="Photon"
                className="size-4 shrink-0"
              />
            }
          >
            Open Photon to approve
          </SetupButton>
          <p className="text-text-soft text-label-xs flex items-center gap-1.5">
            <RiLoader4Line className="size-3 shrink-0 animate-spin" aria-hidden />
            Waiting for approval…
          </p>
        </div>
      ) : (
        <Button
          type="button"
          variant="primary"
          size="xs"
          className="w-fit gap-1.5 px-2 py-1.5"
          onClick={connect}
          // Also gated on the integration identifier: before useFetchIntegrations
          // resolves it is '', which would post to a URL with an empty path segment.
          disabled={!integrationIdentifier || state.phase === 'starting'}
          isLoading={state.phase === 'starting'}
        >
          {state.phase === 'starting' ? 'Connecting…' : 'Connect Photon'}
        </Button>
      )}

      {state.phase === 'denied' ? (
        <InlineToast
          className="w-full"
          variant="error"
          title="Connection denied."
          description="The request was rejected in Photon — click Connect Photon to try again."
        />
      ) : null}
      {state.phase === 'expired' ? (
        <InlineToast
          className="w-full"
          variant="error"
          title="Code expired."
          description="Click Connect Photon to start a new connection."
        />
      ) : null}
      {state.phase === 'error' ? (
        <InlineToast className="w-full" variant="error" title="Photon connect failed." description={state.message} />
      ) : null}
      {state.phase === 'unavailable' ? (
        <InlineToast
          className="w-full"
          variant="warning"
          title={state.reason ?? 'Photon connect is unavailable right now.'}
          description={
            <span>
              {'Create a project at '}
              <a
                href={PHOTON_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                app.photon.codes
              </a>
              {', copy the Project ID and Project Secret, then save them in the credentials form.'}
            </span>
          }
        />
      ) : null}

      <button
        type="button"
        onClick={onOpenCredentials}
        className="text-text-sub hover:text-text-strong w-fit text-label-xs font-medium underline"
      >
        {isCredentialsSaved ? 'Edit credentials' : 'Enter credentials manually instead'}
      </button>
    </div>
  );
}

const PHOTON_MANUAL_INSTRUCTIONS = (
  <>
    In the Photon dashboard open your project's <strong className="text-text-sub">Webhooks</strong> settings, add a
    webhook using the Callback URL from <strong className="text-text-sub">Edit credentials</strong> below, then paste
    the signing secret Photon shows you into the credentials form.
  </>
);

function PhotonStaleWarning({
  agentIdentifier,
  integrationIdentifier,
  staleWebhookUrls,
  onRemoved,
}: {
  agentIdentifier: string;
  integrationIdentifier: string;
  staleWebhookUrls: string[];
  onRemoved: () => void;
}) {
  const { mutateAsync: removeWebhooks, isPending } = useRemovePhotonWebhooks();

  return (
    <StaleNovuWebhooksWarning
      providerLabel="Photon"
      scopeNoun="project"
      descriptionPrefix="Every inbound message is delivered to all of the project's webhooks"
      staleWebhookUrls={staleWebhookUrls}
      removeWebhooks={(webhookUrls) => removeWebhooks({ agentIdentifier, integrationIdentifier, webhookUrls })}
      isRemoving={isPending}
      onRemoved={onRemoved}
    />
  );
}

function PhotonWebhookPanel({
  agent,
  integrationIdentifier,
  isCredentialsSaved,
  hasWebhookSecret,
  onConfigured,
  onOpenCredentials,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  isCredentialsSaved: boolean;
  hasWebhookSecret: boolean;
  onConfigured: () => void;
  onOpenCredentials: () => void;
}) {
  const { mutateAsync: configureWebhook } = useConfigurePhotonWebhook();

  return (
    <ConnectWebhookPanel
      providerLabel="Photon"
      connectLabel="Configure webhook"
      busyLabel="Configuring…"
      integrationIdentifier={integrationIdentifier}
      isCredentialsSaved={isCredentialsSaved}
      hasWebhookSecret={hasWebhookSecret}
      // force on reconfigure: the stored secret may be stale and Photon only issues secrets at registration.
      configureWebhook={(force) =>
        configureWebhook({ agentIdentifier: agent.identifier, integrationIdentifier, force })
      }
      manualInstructions={PHOTON_MANUAL_INSTRUCTIONS}
      staleWarning={(staleWebhookUrls, onRemoved) => (
        <PhotonStaleWarning
          agentIdentifier={agent.identifier}
          integrationIdentifier={integrationIdentifier}
          staleWebhookUrls={staleWebhookUrls}
          onRemoved={onRemoved}
        />
      )}
      onConfigured={onConfigured}
      onOpenCredentials={onOpenCredentials}
    />
  );
}

export function PhotonSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: PhotonSetupGuideProps) {
  const { subscriberId: connectSubscriberId, isReady: isConnectSubscriberReady } = useConnectSubscriber();
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [credentialsSavedLocally, setCredentialsSavedLocally] = useState(false);
  const [isWebhookConfiguredLocally, setIsWebhookConfiguredLocally] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [registration, setRegistration] = useState<PhotonRecipientRegistration | null>(null);

  useEffect(() => {
    setIsConnected(false);
    setCredentialsSavedLocally(false);
    setIsWebhookConfiguredLocally(false);
    setRegistration(readStoredRegistration(integrationId));
  }, [integrationId]);

  const handleRegistered = useCallback(
    (next: PhotonRecipientRegistration) => {
      setRegistration(next);
      writeStoredRegistration(integrationId, next);
    },
    [integrationId]
  );

  const handleResetRegistration = useCallback(() => {
    setRegistration(null);
    writeStoredRegistration(integrationId, null);
  }, [integrationId]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.PhotonImessage),
    [integrations, integrationId]
  );

  const selectedIntegrationIdentifier = selectedIntegration?.identifier ?? '';
  const hasCredentials = hasPhotonProjectCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;

  // Photon issues the signing secret when the webhook is registered (connect does this
  // automatically); its presence marks the webhook step complete across sessions.
  const existingWebhookSecret =
    typeof selectedIntegration?.credentials?.token === 'string' ? selectedIntegration.credentials.token.trim() : '';
  const hasWebhookSecret = existingWebhookSecret.length > 0;
  const isWebhookConfigured = isWebhookConfiguredLocally || hasWebhookSecret;

  const base = stepOffset;

  // The provider-select step (base) is completed on mount since Photon is preselected, so the
  // four real setup steps follow at base+1..base+4.
  const firstIncompleteStep = useMemo(() => {
    if (isConnected) {
      return base + 5;
    }

    if (registration) {
      return base + 4;
    }

    if (isWebhookConfigured) {
      return base + 3;
    }

    if (isCredentialsSaved) {
      return base + 2;
    }

    return base + 1;
  }, [base, isCredentialsSaved, isWebhookConfigured, registration, isConnected]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status="completed"
        title="Setup iMessage via"
        description="Choose the provider and integration that connect iMessage to your agent."
        rightContent={
          <ImessageIntegrationSelect
            providerId={ChatProviderIdEnum.PhotonImessage}
            selectedIntegrationId={integrationId}
          />
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Connect your Photon account"
        description={
          <span>
            {
              'Click Connect Photon and approve the request: Novu creates a Photon project for this agent and saves its '
            }
            <strong className="text-text-sub">Project ID</strong>
            {' and '}
            <strong className="text-text-sub">Project Secret</strong>
            {' automatically. You can also paste them manually from '}
            <a
              href={PHOTON_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              app.photon.codes
            </a>
            {'.'}
          </span>
        }
        rightContent={
          <ConnectPhotonPanel
            agent={agent}
            integrationIdentifier={selectedIntegrationIdentifier}
            isCredentialsSaved={isCredentialsSaved}
            onOpenCredentials={() => setIsCredentialsSidebarOpen(true)}
          />
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Configure the inbound webhook"
        description={
          isCredentialsSaved
            ? 'Connect Photon usually registers the webhook for you. If it is not configured yet, click Configure webhook: Novu registers its inbound URL on your Photon project so incoming iMessages reach your agent.'
            : 'Connect your Photon account above first. Then come back here to register the webhook in one click.'
        }
        rightContent={
          <PhotonWebhookPanel
            agent={agent}
            integrationIdentifier={selectedIntegrationIdentifier}
            isCredentialsSaved={isCredentialsSaved && Boolean(selectedIntegrationIdentifier)}
            hasWebhookSecret={hasWebhookSecret}
            onConfigured={() => setIsWebhookConfiguredLocally(true)}
            onOpenCredentials={() => setIsCredentialsSidebarOpen(true)}
          />
        }
      />

      <SetupStep
        index={base + 3}
        status={deriveStepStatus(base + 3, firstIncompleteStep)}
        dimmed={!isWebhookConfigured}
        title="Register your phone number"
        description="Photon's shared iMessage line only reaches registered numbers. Register yours to get the Photon number your agent will talk to."
        rightContent={
          isConnectSubscriberReady ? (
            <PhotonRegisterPanel
              key={selectedIntegrationIdentifier}
              agentIdentifier={agent.identifier}
              integrationIdentifier={selectedIntegrationIdentifier}
              connectSubscriberId={connectSubscriberId}
              registration={registration}
              onRegistered={handleRegistered}
              onReset={handleResetRegistration}
            />
          ) : null
        }
      />

      <SetupStep
        index={base + 4}
        status={deriveStepStatus(base + 4, firstIncompleteStep)}
        dimmed={!registration}
        title="Text your agent to finish"
        description="Send any message to the Photon number from the phone you registered. That first message is the opt-in Photon requires, and it confirms your agent can reply."
        rightContent={
          registration ? <PhotonInboundTestPanel registration={registration} agentName={agent.name} /> : null
        }
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="Photon is connected: your agent is ready to receive messages."
      listeningMessage="Waiting for the first inbound message from Photon…"
    />
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <SetupStepperRail className="py-6 pb-3 pr-3 md:pr-6">{stepsColumn}</SetupStepperRail>
        <div className="pl-8">{listening}</div>
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
      <ProviderSetupStepperRail>{stepsColumn}</ProviderSetupStepperRail>
      <div className="pl-8">{listening}</div>
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
