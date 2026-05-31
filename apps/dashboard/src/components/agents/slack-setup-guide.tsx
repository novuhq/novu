import { SlackConnectButton } from '@novu/react';
import { ChatProviderIdEnum, FeatureFlagsKeysEnum, SLACK_AGENT_OAUTH_SCOPES } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightUpLine, RiFlashlightLine, RiKey2Line, RiLoader4Line } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { sendAgentWelcomeMessage } from '@/api/agents';
import { slackQuickSetup } from '@/api/integrations';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { CodeBlock } from '@/components/primitives/code-block';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Input } from '@/components/primitives/input';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { API_HOSTNAME } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildAgentConnectionIdentifier } from '@/utils/connect-subscriber-id';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { CopySlackMessageButton } from './agent-code-setup-section';
import type { SetupMode } from './setup-guide-primitives';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  SetupButton,
  SetupModeToggle,
  SetupStep,
} from './setup-guide-primitives';
import { deriveStepStatus, hasIntegrationCredentials } from './setup-guide-step-utils';

export type SlackSetupGuideProps = {
  agent: AgentResponse;
  /** Selected integration Mongo `_id` */
  integrationId: string;
  /** First step index for the Slack block (Overview uses `2`, Integrations detail uses `1`) */
  stepOffset?: number;
  onStepsCompleted?: () => void;
  /** Integrations tab: same content without Overview chrome */
  embedded?: boolean;
  onWelcomeSent?: () => void;
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

/** Same as API `CHAT_OAUTH_CALLBACK_PATH`: Slack OAuth redirect after connect. */
function buildChatOAuthCallbackUrl(): string {
  return `${getApiBaseUrl()}/v1/integrations/chat/oauth/callback`;
}

/**
 * Slack rejects display_name values that contain the reserved word "slack" (case-insensitive).
 * Strip it and fall back to a safe default when nothing is left.
 */
function sanitizeBotDisplayName(name: string): string {
  const sanitized = name.replace(/slack/gi, '').trim();

  return sanitized.length > 0 ? sanitized : 'Novu Bot';
}

function buildSlackManifestYaml(agent: AgentResponse, webhookHandlerUrl: string, chatOAuthCallbackUrl: string): string {
  const botName = escapeYamlDoubleQuoted(sanitizeBotDisplayName(agent.name));
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
  assistant_view:
    assistant_description: "${displayDescription}"
    suggested_prompts:
      - title: "Say hello"
        message: "Hello!"
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
      - reaction_added
      - reaction_removed
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
  connectionIdentifier,
  onSuccess,
}: {
  integrationId: string;
  agentId: string;
  subscriberId: string;
  connectionIdentifier: string;
  onSuccess: () => void;
}) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [configToken, setConfigToken] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      return slackQuickSetup(
        integrationId,
        { configToken: configToken.trim(), agentId, subscriberId, connectionIdentifier },
        environment
      );
    },
    onSuccess: () => {
      setConfigToken('');
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
      onSuccess();
    },
    onError: (error: Error) => {
      showErrorToast(error.message ?? 'Failed to create Slack app');
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <Input
        size="xs"
        type="password"
        placeholder="xoxe.xoxp-1-..."
        value={configToken}
        onChange={(e) => setConfigToken(e.target.value)}
        className="font-mono"
        leadingIcon={RiKey2Line}
        trailingNode={
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!configToken.trim() || mutation.isPending}
            className={cn(
              'flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5',
              'text-text-sub text-label-xs font-medium',
              'transition duration-200 ease-out',
              'hover:bg-bg-weak hover:text-text-strong',
              'disabled:pointer-events-none disabled:text-text-disabled'
            )}
          >
            {mutation.isPending ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiFlashlightLine className="size-3.5" />
            )}
            {mutation.isPending ? 'Creating…' : 'Create app'}
          </button>
        }
      />
    </div>
  );
}

export function SlackSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
  onWelcomeSent,
}: SlackSetupGuideProps) {
  const { currentUser, isUserLoaded } = useAuth();
  const { subscriberId: connectSubscriberId, isReady: isConnectSubscriberReady } = useConnectSubscriber();
  const { currentEnvironment } = useEnvironment();
  const [, setSearchParams] = useSearchParams();
  const isQuickSetupEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_SLACK_QUICK_SETUP_ENABLED, false);
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [credentialsSavedLocally, setCredentialsSavedLocally] = useState(false);
  const [isSlackWorkspaceConnected, setIsSlackWorkspaceConnected] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>('quick');
  const activeSetupMode = isQuickSetupEnabled ? setupMode : 'manual';

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched Slack integration changes
  useEffect(() => {
    setIsSlackWorkspaceConnected(false);
    setCredentialsSavedLocally(false);
  }, [integrationId]);

  const handleSlackWorkspaceConnected = useCallback(() => {
    setIsSlackWorkspaceConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const handleQuickSetupSuccess = useCallback(() => {
    setCredentialsSavedLocally(true);
  }, []);

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.Slack),
    [integrations, integrationId]
  );

  const selectedIntegrationIdentifier = selectedIntegration?.identifier ?? '';

  const handleSlackOAuthSuccess = useCallback(() => {
    handleSlackWorkspaceConnected();

    if (currentEnvironment && selectedIntegrationIdentifier) {
      sendAgentWelcomeMessage(currentEnvironment, agent.identifier, selectedIntegrationIdentifier)
        .then((res) => {
          onWelcomeSent?.();
          if (res.conversationId) {
            setSearchParams((prev) => {
              prev.set('onboardingConversationId', res.conversationId as string);

              return prev;
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to send agent welcome message after Slack OAuth:', err);
        });
    }
  }, [
    handleSlackWorkspaceConnected,
    currentEnvironment,
    agent.identifier,
    selectedIntegrationIdentifier,
    setSearchParams,
    onWelcomeSent,
  ]);
  const hasCredentials = hasIntegrationCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;

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

    return activeSetupMode === 'quick' ? base + 1 : base + 2;
  }, [base, isCredentialsSaved, isSlackWorkspaceConnected, activeSetupMode]);

  const modeSwitcher = isQuickSetupEnabled ? (
    <div className="pl-6">
      <SetupModeToggle mode={setupMode} onChange={setSetupMode} />
    </div>
  ) : null;

  const connectionIdentifier =
    isUserLoaded && currentUser?._id ? buildAgentConnectionIdentifier(currentUser._id, agent._id) : null;

  const slackInstallConnectControl =
    isConnectSubscriberReady && connectionIdentifier && selectedIntegrationIdentifier ? (
      <SlackConnectButton
        integrationIdentifier={selectedIntegrationIdentifier}
        subscriberId={connectSubscriberId}
        connectionIdentifier={connectionIdentifier}
        connectionMode="subscriber"
        connectLabel={`Install ${agent.name} ↗`}
        connectedLabel="Connected to Slack"
        onConnectSuccess={handleSlackOAuthSuccess}
        onConnectError={(error: unknown) => {
          showErrorToast('Failed to connect to Slack. Please try again.');
          console.error(error);
        }}
        appearance={{
          elements: {
            channelConnectButton: 'nt-h-8 nt-px-3 nt-rounded-lg',
          },
        }}
      />
    ) : null;

  const renderSlackInstallStepRightContent = (completePrerequisiteStepIndex: number) => (
    <div className="flex min-w-0 flex-col gap-3">
      {isCredentialsSaved && slackInstallConnectControl ? (
        slackInstallConnectControl
      ) : (
        <>
          <SetupButton disabled>{`Install ${agent.name} ↗`}</SetupButton>
          {!isCredentialsSaved && (
            <p className="text-text-soft text-label-xs">Complete step {completePrerequisiteStepIndex} first.</p>
          )}
        </>
      )}
    </div>
  );

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
              'Generate a Slack App Configuration Token on the Slack API page (under Your App Configuration Tokens → Generate Token). Paste it below. It is used once to create your app and then discarded.'
            }
          </span>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3">
            <SetupButton href="https://api.slack.com/apps">Slack App Configuration Token</SetupButton>
            {!isCredentialsSaved ? (
              isConnectSubscriberReady && connectionIdentifier ? (
                <QuickSetupStep
                  integrationId={integrationId}
                  agentId={agent._id}
                  subscriberId={connectSubscriberId}
                  connectionIdentifier={connectionIdentifier}
                  onSuccess={handleQuickSetupSuccess}
                />
              ) : null
            ) : (
              <InlineToast
                className="w-full"
                variant="success"
                title="App created!"
                description="Your Slack app credentials have been saved to the integration."
              />
            )}
          </div>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Verify by installing the app to your workspace"
        description="This is what your users need to do to install the slack app to their workspace to start interacting with it."
        rightContent={renderSlackInstallStepRightContent(base)}
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Send your first message"
        description={
          <span>
            {'Open a channel in your Slack workspace, type '}
            <code className="bg-bg-weak rounded px-1 py-0.5 font-code text-xs">@</code>
            {' and select '}
            <code className="bg-bg-weak rounded px-1 py-0.5 font-code text-xs">{agent.name}</code>
            {' from the suggestions, then send a message. You should see the agent respond.'}
          </span>
        }
        rightContent={<CopySlackMessageButton agentName={agent.name} />}
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
              'Paste the App Credentials block from your Slack app (you can also CMD+A and CMD+C the whole page!). The App ID, Client ID, Client Secret and Signing Secret are filled automatically in the configure tab.'
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
        rightContent={renderSlackInstallStepRightContent(base + 1)}
      />
    </>
  );

  const stepsColumn = activeSetupMode === 'quick' ? quickStepsColumn : manualStepsColumn;

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleSlackWorkspaceConnected}
      connectedMessage="Your Slack workspace is connected — check your DMs for a welcome message from the bot!"
      listeningMessage="Install the app to your Slack workspace to continue."
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
