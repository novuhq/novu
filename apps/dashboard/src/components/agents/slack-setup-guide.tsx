import { useUser } from '@clerk/clerk-react';
import { NovuProvider, SlackConnectButton } from '@novu/react';
import { ChatProviderIdEnum, FeatureFlagsKeysEnum, SLACK_AGENT_OAUTH_SCOPES } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightUpLine, RiFlashlightLine, RiKey2Line, RiLoader4Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { slackQuickSetup } from '@/api/integrations';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { CodeBlock } from '@/components/primitives/code-block';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Input } from '@/components/primitives/input';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { API_HOSTNAME } from '@/config';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import type { SetupMode } from './setup-guide-primitives';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  SetupButton,
  SetupModeToggle,
  SetupStep,
} from './setup-guide-primitives';
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
  app_home:
    home_tab_enabled: false
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false
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

function ManifestControls({
  createSlackAppUrl,
  showManifest,
  onToggle,
}: {
  createSlackAppUrl: string;
  showManifest: boolean;
  onToggle: () => void;
}) {
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
        className="text-text-sub hover:text-text-strong flex cursor-pointer items-center gap-1 self-start py-1 transition-colors"
        onClick={onToggle}
      >
        <RiArrowDownSLine className={cn('size-3.5 transition-transform duration-200', showManifest && 'rotate-180')} />
        <span className="text-label-xs font-medium">{showManifest ? 'Hide manifest' : 'Show manifest'}</span>
      </button>
    </div>
  );
}

function ManifestCode({ manifestYaml, show }: { manifestYaml: string; show: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
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
  );
}

function QuickSetupStep({
  integrationId,
  agentId,
  subscriberId,
  user,
  onSuccess,
}: {
  integrationId: string;
  agentId: string;
  subscriberId: string;
  user: { firstName?: string | null; lastName?: string | null; imageUrl?: string } | null | undefined;
  onSuccess: (oauthAuthorizeUrl: string) => void;
}) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [configToken, setConfigToken] = useState('');

  const connectionIdentifier = subscriberId;

  const mutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      return slackQuickSetup(
        integrationId,
        { configToken: configToken.trim(), agentId, subscriberId, connectionIdentifier },
        environment
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
      onSuccess(data.oauthAuthorizeUrl);
    },
    onError: (error: Error) => {
      showErrorToast(error.message ?? 'Failed to create Slack app');
    },
  });

  const novuProviderContent = currentEnvironment?.identifier ? (
    <NovuProvider
      subscriber={{
        subscriberId,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        avatar: user?.imageUrl ?? '',
      }}
      applicationIdentifier={currentEnvironment.identifier}
      apiUrl={apiHostnameManager.getHostname()}
      socketUrl={apiHostnameManager.getWebSocketHostname()}
    >
      {/* Mounting NovuProvider upserts the subscriber so it exists when the OAuth callback fires */}
      <span />
    </NovuProvider>
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      {novuProviderContent}
      <div className="flex items-center gap-2">
        <Input
          type="password"
          placeholder="xoxe.xoxp-1-..."
          value={configToken}
          onChange={(e) => setConfigToken(e.target.value)}
          className="font-mono text-xs"
        />
        <SetupButton
          onClick={() => mutation.mutate()}
          disabled={!configToken.trim() || mutation.isPending}
          leadingIcon={
            mutation.isPending ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiFlashlightLine className="size-3.5" />
            )
          }
        >
          {mutation.isPending ? 'Creating…' : 'Create app'}
        </SetupButton>
      </div>
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
  const isQuickSetupEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_SLACK_QUICK_SETUP_ENABLED, false);
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isCredentialsSaved, setIsCredentialsSaved] = useState(false);
  const [isSlackWorkspaceConnected, setIsSlackWorkspaceConnected] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>('quick');
  const [pendingOauthUrl, setPendingOauthUrl] = useState<string | null>(null);
  const activeSetupMode = isQuickSetupEnabled ? setupMode : 'manual';

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched Slack integration changes
  useEffect(() => {
    setIsSlackWorkspaceConnected(false);
    setPendingOauthUrl(null);
  }, [integrationId]);

  const handleSlackWorkspaceConnected = useCallback(() => {
    setIsSlackWorkspaceConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const handleQuickSetupSuccess = useCallback((oauthAuthorizeUrl: string) => {
    setIsCredentialsSaved(true);
    setPendingOauthUrl(oauthAuthorizeUrl);
  }, []);

  const handleInstallClick = useCallback(() => {
    if (pendingOauthUrl) {
      window.open(pendingOauthUrl, '_blank', 'noopener,noreferrer');
    }
  }, [pendingOauthUrl]);

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
      return activeSetupMode === 'quick' ? base + 2 : base + 3;
    }

    if (!isCredentialsSaved) {
      return base;
    }

    return activeSetupMode === 'quick' ? base + 1 : base + 2;
  }, [base, isCredentialsSaved, isSlackWorkspaceConnected, activeSetupMode]);

  const modeSwitcher = isQuickSetupEnabled ? <SetupModeToggle mode={setupMode} onChange={setSetupMode} /> : null;

  const connectButton =
    user?.externalId && currentEnvironment?.identifier ? (
      <NovuProvider
        subscriber={{
          subscriberId: `${user.externalId}:agent-quickstart:${agent._id}`,
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
          connectionIdentifier={`${user.externalId}:agent-quickstart:${agent._id}`}
          connectionMode="subscriber"
          connectLabel={`Install ${agent.name} ↗`}
          connectedLabel="Connected to Slack"
          onConnectSuccess={handleSlackWorkspaceConnected}
          appearance={{
            elements: {
              channelConnectButton: 'nt-h-8 nt-px-3 nt-rounded-lg',
            },
          }}
        />
      </NovuProvider>
    ) : null;

  const quickStepsColumn = (
    <>
      {modeSwitcher}

      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Create Slack App automatically"
        description={
          <span>
            {
              'Generate a Slack App Configuration Token on the Slack API page (under Your App Configuration Tokens → Generate Token). Paste it below — it will be used once to create your app and then discarded.'
            }
          </span>
        }
        rightContent={<SetupButton href="https://api.slack.com/apps">Slack App Configuration Token</SetupButton>}
        extraContent={
          !isCredentialsSaved ? (
            <div className="mt-2">
              <QuickSetupStep
                integrationId={integrationId}
                agentId={agent._id}
                subscriberId={`${user?.externalId}:agent-quickstart:${agent._id}`}
                user={user}
                onSuccess={handleQuickSetupSuccess}
              />
            </div>
          ) : (
            <InlineToast
              className="mt-2 w-full"
              variant="success"
              title="App created!"
              description="Your Slack app credentials have been saved to the integration."
            />
          )
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Install app to your workspace"
        description="Click to open the Slack authorization page and install the newly created app."
        rightContent={
          pendingOauthUrl ? (
            <Button variant="primary" size="sm" onClick={handleInstallClick}>
              <ProviderIcon
                providerId={ChatProviderIdEnum.Slack}
                providerDisplayName="Slack"
                className="size-4 shrink-0 brightness-200"
              />
              Install to Slack ↗
            </Button>
          ) : (
            connectButton
          )
        }
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
      />
    </>
  );

  const manualStepsColumn = (
    <>
      {modeSwitcher}

      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Create Slack App via Manifest"
        description="Click the button to create a Slack app with a pre-filled manifest, or expand to view and copy the YAML manually."
        rightContent={
          <ManifestControls
            createSlackAppUrl={createSlackAppUrl}
            showManifest={showManifest}
            onToggle={() => setShowManifest((prev) => !prev)}
          />
        }
        fullWidthContent={<ManifestCode manifestYaml={manifestYaml} show={showManifest} />}
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Paste the app credentials to the integration"
        description={
          <span>
            {
              'Paste the App Credentials block from your Slack app (You can also CMD+A and CMD+C the whole page!) — the App ID, Client ID, Client Secret and Signing Secret are filled automatically in the configure tab.'
            }
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
        rightContent={connectButton}
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
      />
    </>
  );

  const stepsColumn = activeSetupMode === 'quick' ? quickStepsColumn : manualStepsColumn;

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleSlackWorkspaceConnected}
      connectedMessage="Your Slack workspace is connected. This agent is ready to receive messages."
      listeningMessage="Tag the Slack bot in your installed workspace and send a message to verify configuration."
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
        onSaveSuccess={() => setIsCredentialsSaved(true)}
        agentOnboarding
      />
    </>
  );
}
