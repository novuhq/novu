import { useUser } from '@clerk/clerk-react';
import { NovuProvider, SlackConnectButton } from '@novu/react';
import { ChatProviderIdEnum, SLACK_AGENT_OAUTH_SCOPES } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { createPortal } from 'react-dom';
import { RiArrowDownSLine, RiArrowRightUpLine, RiKey2Line } from 'react-icons/ri';
import { type AgentResponse, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { CodeBlock } from '@/components/primitives/code-block';
import { InlineToast } from '@/components/primitives/inline-toast';
import { ExternalLink } from '@/components/shared/external-link';
import { API_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

export type SlackSetupGuideProps = {
  agent: AgentResponse;
  /** Selected integration Mongo `_id` */
  integrationId: string;
  /** First step index for the Slack block (Overview uses `2`, Integrations detail uses `1`) */
  stepOffset?: number;
  onStepsCompleted?: () => void;
  /** Integrations tab: same content without Overview chrome */
  embedded?: boolean;
};

function ListeningStatus({
  agentIdentifier,
  watchedIntegrationId,
  onSlackWorkspaceConnected,
}: {
  agentIdentifier: string;
  watchedIntegrationId: string | undefined;
  onSlackWorkspaceConnected?: () => void;
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

        if (!link) {
          return;
        }

        if (!link.connectedAt) {
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
          onSlackWorkspaceConnected?.();
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
  }, [agentIdentifier, currentEnvironment, onSlackWorkspaceConnected, queryClient, watchedIntegrationId]);

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
      <div className="flex flex-col gap-2 pl-8 py-4">
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
            {connectedAt
              ? 'Your Slack workspace is connected. This agent is ready to receive messages.'
              : 'Tag the Slack bot in your installed workspace and send a message to verify configuration.'}
          </p>
        </div>
        <ExternalLink href="https://docs.novu.co/agents/overview" variant="documentation">
          Learn more in docs
        </ExternalLink>
      </div>
    </>
  );
}

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getApiBaseUrl(): string {
  return (API_HOSTNAME ?? 'https://api.novu.co').replace(/\/$/, '');
}

function buildAgentSlackWebhookUrl(agentId: string, integrationIdentifier: string): string {
  return `${getApiBaseUrl()}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

/** Matches API `CHAT_OAUTH_CALLBACK_PATH` — Slack OAuth redirect after connect. */
function buildChatOAuthCallbackUrl(): string {
  return `${getApiBaseUrl()}/v1/integrations/chat/oauth/callback`;
}

function buildSlackManifestYaml(agent: AgentResponse, webhookHandlerUrl: string, chatOAuthCallbackUrl: string): string {
  const botName = escapeYamlDoubleQuoted(agent.name);
  const displayDescription = escapeYamlDoubleQuoted(agent.description?.trim() || 'Agent built with Novu');
  const oauthCallbackQuoted = escapeYamlDoubleQuoted(chatOAuthCallbackUrl);
  const webhookHandlerUrlQuoted = escapeYamlDoubleQuoted(webhookHandlerUrl);
  const botScopesYaml = SLACK_AGENT_OAUTH_SCOPES.map((scope) => `      - ${scope}`).join('\n');

  return `display_information:
  name: "${botName}"
  description: "${displayDescription}"

features:
  bot_user:
    display_name: "${botName}"
    always_online: true

oauth_config:
  redirect_urls:
    - "${oauthCallbackQuoted}"
  scopes:
    bot:
${botScopesYaml}

settings:
  event_subscriptions:
    request_url: "${webhookHandlerUrlQuoted}"
    bot_events:
      - app_mention
      - message.channels
      - message.groups
      - message.im
      - message.mpim
      - member_joined_channel
      - assistant_thread_started
      - assistant_thread_context_changed
  interactivity:
    is_enabled: true
    request_url: "${webhookHandlerUrlQuoted}"
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false`;
}

function ManifestSection({ createSlackAppUrl, manifestYaml }: { createSlackAppUrl: string; manifestYaml: string }) {
  const [showManifest, setShowManifest] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <a href={createSlackAppUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="secondary" mode="outline" size="xs" className="text-text-sub gap-1 px-2 py-1.5" type="button">
          <ProviderIcon providerId={ChatProviderIdEnum.Slack} providerDisplayName="Slack" className="size-4 shrink-0" />
          <span className="text-label-xs font-medium">Create slack app</span>
          <RiArrowRightUpLine className="size-3" />
        </Button>
      </a>

      <button
        type="button"
        className="text-text-sub hover:text-text-strong flex items-center gap-1 self-start py-1 transition-colors"
        onClick={() => setShowManifest((prev) => !prev)}
      >
        <RiArrowDownSLine className={cn('size-3.5 transition-transform duration-200', showManifest && 'rotate-180')} />
        <span className="text-label-xs font-medium">{showManifest ? 'Hide manifest' : 'Show manifest'}</span>
      </button>

      <AnimatePresence initial={false}>
        {showManifest && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <CodeBlock code={manifestYaml} language="shell" title="slack-app-manifest.yaml" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SlackSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: SlackSetupGuideProps) {
  const { user } = useUser();
  const { currentEnvironment } = useEnvironment();
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isCredentialsSaved, setIsCredentialsSaved] = useState(false);
  const [isSlackWorkspaceConnected, setIsSlackWorkspaceConnected] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched Slack integration changes
  useEffect(() => {
    setIsSlackWorkspaceConnected(false);
  }, [integrationId]);

  const handleSlackWorkspaceConnected = useCallback(() => {
    setIsSlackWorkspaceConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const { integrations } = useFetchIntegrations();

  const selectedIntegrationIdentifier = useMemo(() => {
    const row = integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.Slack);

    return row?.identifier ?? '';
  }, [integrations, integrationId]);

  const webhookHandlerUrl = buildAgentSlackWebhookUrl(
    agent._id,
    selectedIntegrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER'
  );
  const chatOAuthCallbackUrl = buildChatOAuthCallbackUrl();
  const manifestYaml = buildSlackManifestYaml(agent, webhookHandlerUrl, chatOAuthCallbackUrl);
  const createSlackAppUrl = `https://api.slack.com/apps?new_app=1&manifest_yaml=${encodeURIComponent(manifestYaml)}`;

  const base = stepOffset;

  const firstIncompleteStep = useMemo(() => {
    if (isSlackWorkspaceConnected) {
      return base + 3;
    }

    if (!isCredentialsSaved) {
      return base;
    }

    return base + 2;
  }, [base, isCredentialsSaved, isSlackWorkspaceConnected]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Create Slack App via Manifest"
        description="Click the button to create a Slack app with a pre-filled manifest, or expand to view and copy the YAML manually."
        rightContent={<ManifestSection createSlackAppUrl={createSlackAppUrl} manifestYaml={manifestYaml} />}
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Paste the app credentials to the integration"
        description={
          <span>
            {
              'Paste the App ID, Client ID, Client Secret and Signing Secret from your Slack app into the integration. View '
            }
            <a
              href="https://docs.novu.co/integrations/chat/slack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              setup guide
            </a>
            .
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

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Verify by installing the app to your workspace"
        description={`This is what your users need to do to install the slack app to their workspace to start interacting with it.`}
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Tip:"
            description={
              <>
                Novu provides a{' '}
                <code className="font-code text-[12px] tracking-[-0.24px]">{'<SlackConnectButton />'}</code>
                {' component, to let your users easily connect this agent to their Slack workspace. '}
                <a
                  href="https://docs.novu.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-sub underline"
                >
                  Read docs
                </a>
              </>
            }
          />
        }
        rightContent={
          user?.externalId && currentEnvironment?.identifier ? (
            <NovuProvider
              subscriber={{
                subscriberId: user.externalId + ':agent-quickstart:' + agent._id,
                firstName: user.firstName ?? '',
                lastName: user.lastName ?? '',
                avatar: user.imageUrl ?? '',
              }}
              applicationIdentifier={currentEnvironment.identifier}
              apiUrl={apiHostnameManager.getHostname()}
              socketUrl={apiHostnameManager.getWebSocketHostname()}
            >
              <SlackConnectButton
                integrationIdentifier={selectedIntegrationIdentifier}
                connectionIdentifier={user.externalId + ':agent-quickstart:' + agent._id}
                connectionMode="subscriber"
                connectLabel={`Install ${agent.name} ↗`}
                connectedLabel="Connected to Slack"
              />
            </NovuProvider>
          ) : null
        }
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onSlackWorkspaceConnected={handleSlackWorkspaceConnected}
    />
  );

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
        <IntegrationCredentialsSidebar
          integrationId={integrationId}
          isOpen={isCredentialsSidebarOpen}
          onClose={() => setIsCredentialsSidebarOpen(false)}
          onSaveSuccess={() => setIsCredentialsSaved(true)}
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
        onSaveSuccess={() => setIsCredentialsSaved(true)}
      />
    </>
  );
}
