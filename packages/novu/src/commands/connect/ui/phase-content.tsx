import { PasswordInput, Select, TextInput } from '@inkjs/ui';
import { AWS_CLAUDE_COMMERCIAL_REGIONS } from '@novu/shared';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { CONNECT_CHANNEL_PICKER_OPTIONS } from '../connect-channel-picker-options';
import { CONNECT_MODE_PICKER_SUBTITLE, CONNECT_MODE_PICKER_TITLE } from '../connect-mode-options';
import {
  type ConnectSuccessDestination,
  channelDisplayName,
  isDashboardOnlyChannel,
  resolveConnectSuccessDestination,
  UNCLAIMED_KEYLESS_HINT,
} from '../dashboard-urls';
import { ConnectUserCancelledError } from '../errors';
import { resolveBridgeSetupFollowUpMessage } from '../pipeline/bridge/setup-outcome-message';
import { LLM_AUTH_PICKER_SUBTITLE, LLM_AUTH_PICKER_TITLE } from '../pipeline/llm-auth/llm-auth-options';
import type { AgentChatSetupMode, ChannelChoice } from '../types';
import { BridgeReconcilePhaseContent, isBridgeReconcilePhase } from './bridge-reconcile-phase-content';
import { copyToClipboard } from './copy-to-clipboard';
import { CopyableLink } from './copyable-link';
import { GroupedConnectModeSelect } from './grouped-connect-mode-select';
import { LlmAuthPicker } from './llm-auth-picker';
import { EmailReadyContent, EmailWaitingContent } from './phase-content/email';
import {
  SendblueCredentialContent,
  SendblueIntroContent,
  SendblueTestPhoneContent,
  SendblueTestWaitingContent,
  SendblueWebhookManualContent,
} from './phase-content/sendblue';
import { PasteSlackConfigTokenContent, SlackOAuthReadyContent, WaitingSlackContent } from './phase-content/slack';
import {
  PickTelegramTokenDeliveryContent,
  TelegramIntroContent,
  TelegramLinkTokenContent,
  TelegramTestContent,
} from './phase-content/telegram';
import {
  WhatsAppSignupReadyContent,
  WhatsAppSignupWaitingContent,
  WhatsAppTestContent,
} from './phase-content/whatsapp';
import { PreviewGeneratedContent } from './preview-generated-content';
import type { ConnectStore } from './store';
import { WelcomeContent } from './welcome-content';

const NEW_AGENT_VALUE = '__new__';
const NEW_INTEGRATION_VALUE = '__new_integration__';

const TAGLINES: ReadonlyArray<string> = [
  'Listening for your idea…',
  'Tuning the system prompt…',
  'Picking the right tools…',
  'Wiring up MCP servers…',
  'Reaching for Anthropic skills…',
  'Adding finishing sparkles…',
];

export function PhaseContent({
  phase,
  onChannelHover,
  previewMorphComplete,
}: {
  phase: ReturnType<ConnectStore['phase']['get']>;
  onChannelHover: (channel: ChannelChoice | null) => void;
  previewMorphComplete: boolean;
}): React.ReactElement {
  if (isBridgeReconcilePhase(phase)) {
    return BridgeReconcilePhaseContent({ phase });
  }

  switch (phase.kind) {
    case 'welcome':
      return <WelcomeContent onContinue={phase.resolve} />;

    case 'auth':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">{phase.status}</Text>
          {phase.dashboardUrl ? (
            <CopyableLink url={phase.dashboardUrl} hint="If your browser didn't open, visit:" />
          ) : null}
        </Box>
      );

    case 'listing-agents':
      return <Text color="cyan">Checking for existing agents…</Text>;

    case 'loading-integrations':
      return <Text color="cyan">Looking up agent runtime integrations…</Text>;

    case 'pick-llm-auth':
      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text bold>{LLM_AUTH_PICKER_TITLE}</Text>
            <Text dimColor>{LLM_AUTH_PICKER_SUBTITLE}</Text>
          </Box>
          <LlmAuthPicker
            connectMode={phase.connectMode}
            onChange={(value) => phase.resolve(value)}
            onCancel={() => phase.reject(new ConnectUserCancelledError())}
          />
          <Text color="cyan">Enter · select · Esc · cancel</Text>
        </Box>
      );

    case 'pick-connect-mode':
      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text bold>{CONNECT_MODE_PICKER_TITLE}</Text>
            <Text dimColor>{CONNECT_MODE_PICKER_SUBTITLE}</Text>
          </Box>
          <GroupedConnectModeSelect onChange={(value) => phase.resolve(value)} />
        </Box>
      );

    case 'pick-integration': {
      const options = [
        ...phase.integrations.map((integration) => ({
          label: `${integration.name} (${integration.identifier})`,
          value: integration._id,
        })),
        { label: '+ Set up new credentials', value: NEW_INTEGRATION_VALUE },
      ];

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{`Select a ${phase.providerLabel} integration`}</Text>
          <Text dimColor>Reuse saved credentials or add new ones for this run.</Text>
          <Select
            options={options}
            onChange={(value) => {
              if (value === NEW_INTEGRATION_VALUE) {
                phase.resolve({ kind: 'new' });

                return;
              }

              phase.resolve({ kind: 'existing', integrationId: value });
            }}
          />
        </Box>
      );
    }

    case 'prompt-secret':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{phase.title}</Text>
          {phase.hint ? <Text dimColor>{phase.hint}</Text> : null}
          {phase.verificationError ? (
            <Text color="yellow">Credentials were rejected: {phase.verificationError}</Text>
          ) : null}
          <Box borderStyle="round" paddingX={1}>
            {/* Secrets mask by default; callers opt out with `secret: false` for non-sensitive values. */}
            {phase.secret === false ? (
              <TextInput placeholder={phase.placeholder} onSubmit={(value) => phase.resolve(value)} />
            ) : (
              <PasswordInput placeholder={phase.placeholder} onSubmit={(value) => phase.resolve(value)} />
            )}
          </Box>
          <Text dimColor>Press Enter to submit.</Text>
        </Box>
      );

    case 'pick-aws-region': {
      const options = AWS_CLAUDE_COMMERCIAL_REGIONS.map((region) => ({
        label: region,
        value: region,
      }));

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>AWS Claude region</Text>
          <Text dimColor>Select the commercial region for your AWS Claude Platform workspace.</Text>
          <Select options={options} onChange={(value) => phase.resolve(value)} />
        </Box>
      );
    }

    case 'verifying-credentials':
      return <Text color="cyan">Verifying credentials…</Text>;

    case 'pick': {
      const options = [
        ...phase.agents.map((agent) => ({
          label: `${agent.name} (${agent.identifier})`,
          value: agent.id,
        })),
        { label: '+ Create a new agent', value: NEW_AGENT_VALUE },
      ];

      return (
        <Box flexDirection="column" gap={1}>
          <Text>You already have agents in this environment. What would you like to do?</Text>
          <Select
            options={options}
            onChange={(value) => {
              if (value === NEW_AGENT_VALUE) {
                phase.resolve({ action: 'new' });

                return;
              }
              const agent = phase.agents.find((a) => a.id === value);
              if (agent) phase.resolve({ action: 'use', agent });
            }}
          />
        </Box>
      );
    }

    case 'describe':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{phase.previousPrompt ? 'Refine your description' : 'Describe your agent'}</Text>
          {phase.previousPrompt ? (
            <Text dimColor>{`Previous: "${truncateInline(phase.previousPrompt, 72)}"`}</Text>
          ) : null}
          <Text dimColor>e.g. a customer-support agent that books demos and escalates billing questions.</Text>
          <Box borderStyle="round" paddingX={1}>
            <TextInput placeholder="Describe what your agent should do…" onSubmit={(value) => phase.resolve(value)} />
          </Box>
          <Text dimColor>Press Enter to submit. Minimum 8 characters.</Text>
        </Box>
      );

    case 'generating':
      return <GeneratingContent />;

    case 'preview-generated':
      return (
        <PreviewGeneratedContent spec={phase.spec} onResolve={phase.resolve} morphComplete={previewMorphComplete} />
      );

    case 'creating':
      return <Text color="cyan">{`Creating agent "${phase.name}"…`}</Text>;

    case 'pick-channel': {
      const options = [...CONNECT_CHANNEL_PICKER_OPTIONS];

      return (
        <Box flexDirection="column" gap={1} alignItems="flex-start">
          <Text bold wrap="wrap">
            Pick a channel to connect this agent to
          </Text>
          <ChannelSelect options={options} onChange={(value) => phase.resolve(value)} onHighlight={onChannelHover} />
        </Box>
      );
    }

    case 'adding-whatsapp':
      return <Text color="cyan">Linking WhatsApp to your agent…</Text>;

    case 'whatsapp-signup-ready':
      return <WhatsAppSignupReadyContent signupUrl={phase.signupUrl} onContinue={phase.resolve} />;

    case 'whatsapp-signup-waiting':
      return <WhatsAppSignupWaitingContent phase={phase} />;

    case 'whatsapp-test':
      return <WhatsAppTestContent phase={phase} />;

    case 'adding-slack':
      return <Text color="cyan">Linking Slack to your agent…</Text>;

    case 'adding-agent-chat':
      return <Text color="cyan">Linking Agent Chat to your agent…</Text>;

    case 'agent-chat-handoff':
      return <AgentChatHandoffContent dashboardUrl={phase.dashboardUrl} onContinue={phase.resolve} />;

    case 'pick-agent-chat-setup':
      return <AgentChatSetupPickContent projectKind={phase.projectKind} onResolve={phase.resolve} />;

    case 'agent-chat-embed-ready':
      return (
        <AgentChatEmbedReadyContent
          embedPrompt={phase.embedPrompt}
          embedPromptFile={phase.embedPromptFile}
          envPaths={phase.envPaths}
          onContinue={phase.resolve}
        />
      );

    case 'scaffolding-agent-chat':
      return (
        <Box flexDirection="column" gap={1} alignItems="center">
          <Text color="cyan">Scaffolding your Agent Chat example app…</Text>
          <Text dimColor>Installing dependencies — this may take a minute.</Text>
        </Box>
      );

    case 'paste-slack-token':
      return <PasteSlackConfigTokenContent phase={phase} />;

    case 'running-slack-quick-setup':
      return <Text color="cyan">Creating Slack app from manifest…</Text>;

    case 'slack-oauth-ready':
      return (
        <SlackOAuthReadyContent
          appCreated={phase.appCreated}
          authorizeUrl={phase.authorizeUrl}
          onContinue={phase.resolve}
        />
      );

    case 'waiting-slack':
      return <WaitingSlackContent phase={phase} />;

    case 'adding-email':
      return <Text color="cyan">Linking Email to your agent…</Text>;

    case 'email-ready':
      return (
        <EmailReadyContent
          inboundAddress={phase.inboundAddress}
          mailtoUrl={phase.mailtoUrl}
          sendFromEmail={phase.sendFromEmail}
          onContinue={phase.resolve}
          onBack={phase.onBack}
        />
      );

    case 'email-waiting':
      return <EmailWaitingContent phase={phase} />;

    case 'adding-telegram':
      return <Text color="cyan">Linking Telegram to your agent…</Text>;

    case 'telegram-intro':
      return <TelegramIntroContent botfatherQr={phase.botfatherQr} onContinue={phase.resolve} />;

    case 'pick-telegram-token-delivery':
      return <PickTelegramTokenDeliveryContent phase={phase} />;

    case 'telegram-link-token':
      return <TelegramLinkTokenContent phase={phase} />;

    case 'telegram-test':
      return <TelegramTestContent phase={phase} />;

    case 'adding-sendblue':
      return <Text color="cyan">Linking iMessage (Sendblue) to your agent…</Text>;

    case 'sendblue-intro':
      return <SendblueIntroContent dashboardUrl={phase.dashboardUrl} onContinue={phase.resolve} />;

    case 'sendblue-credential':
      return <SendblueCredentialContent phase={phase} />;

    case 'configuring-sendblue-webhook':
      return <Text color="cyan">Registering your Sendblue receive webhook…</Text>;

    case 'sendblue-webhook-manual':
      return (
        <SendblueWebhookManualContent
          callbackUrl={phase.callbackUrl}
          webhookSecret={phase.webhookSecret}
          onContinue={phase.resolve}
        />
      );

    case 'sendblue-test-phone':
      return <SendblueTestPhoneContent phase={phase} />;

    case 'sending-sendblue-test':
      return <Text color="cyan">Sending a test iMessage…</Text>;

    case 'sendblue-test-waiting':
      return <SendblueTestWaitingContent phase={phase} />;

    case 'sending-welcome':
      return <Text color="cyan">Asking your agent to say hello…</Text>;

    case 'dashboard-channel-ready':
      return (
        <DashboardChannelReadyContent
          channel={phase.channel}
          agentDetailsUrl={phase.agentDetailsUrl}
          onContinue={phase.resolve}
        />
      );

    case 'success':
      return <SuccessView phase={phase} />;

    case 'error':
      return <Text color="red">✗ {phase.message}</Text>;

    default: {
      const _exhaustive: never = phase;

      return <Text />;
    }
  }
}

/**
 * Per-channel picker hints. Channels without an entry render no hint;
 * dashboard-only channels additionally get the `↗` glyph via
 * {@link isDashboardOnlyChannel}.
 */
const CHANNEL_HINTS: Partial<Record<ChannelChoice, string>> = {
  teams: 'Onboarding for this channel is currently only available in the Novu Connect UI.',
  whatsapp:
    'Opens Meta signup in your browser — the CLI resumes automatically. Falls back to the Novu Connect UI when unavailable.',
};
/** Keeps the picker + hint from widening the centered layout when the hint appears. */
const CHANNEL_PICKER_WIDTH = 48;
/** WhatsApp hint wraps to 3 lines — reserve that height always so Ink incremental diffs don't shrink. */
const CHANNEL_HINT_RESERVED_LINES = 3;

function ChannelSelect({
  options,
  onChange,
  onHighlight,
}: {
  options: Array<{ label: string; value: ChannelChoice }>;
  onChange: (value: ChannelChoice) => void;
  onHighlight: (value: ChannelChoice | null) => void;
}): React.ReactElement {
  const uniqueOptions = options.filter(
    (opt, index, arr) => arr.findIndex((candidate) => candidate.value === opt.value) === index
  );
  const [idx, setIdx] = React.useState(0);

  // Seed the parent with the initial highlight so the orb doesn't sit on
  // white for a frame before the user touches the arrow keys.
  React.useEffect(() => {
    onHighlight(uniqueOptions[0]?.value ?? null);
    // We only want to fire on mount; subsequent highlights flow through useInput.
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  }, []);

  useInput((_input, key) => {
    if (key.upArrow) {
      const next = (idx - 1 + uniqueOptions.length) % uniqueOptions.length;
      setIdx(next);
      onHighlight(uniqueOptions[next].value);
    } else if (key.downArrow) {
      const next = (idx + 1) % uniqueOptions.length;
      setIdx(next);
      onHighlight(uniqueOptions[next].value);
    } else if (key.return) {
      onChange(uniqueOptions[idx].value);
    }
  });

  const highlighted = uniqueOptions[idx]?.value ?? null;
  const channelHint = highlighted !== null ? CHANNEL_HINTS[highlighted] : undefined;
  const hintLines = buildChannelHintLines(channelHint);

  return (
    <Box flexDirection="column" gap={1} alignItems="flex-start">
      <Box flexDirection="column" alignItems="flex-start">
        {uniqueOptions.map((opt, i) => {
          const isSelected = i === idx;
          const opensInDashboard = isDashboardOnlyChannel(opt.value);
          const prefix = isSelected ? '› ' : '  ';

          return (
            <Text key={opt.value} color={isSelected ? 'cyan' : undefined}>
              {prefix}
              {opt.label}
              {opensInDashboard ? <Text dimColor> ↗</Text> : null}
            </Text>
          );
        })}
      </Box>
      <Box flexDirection="column" width={CHANNEL_PICKER_WIDTH}>
        {hintLines.map((line, lineIndex) => (
          <Text key={lineIndex} dimColor={Boolean(channelHint && line.trim().length > 0)}>
            {line.length > 0 ? line : ' '}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

function buildChannelHintLines(channelHint: string | undefined): string[] {
  const lines = channelHint ? wrapHintLines(channelHint, CHANNEL_PICKER_WIDTH) : [];

  while (lines.length < CHANNEL_HINT_RESERVED_LINES) {
    lines.push('');
  }

  return lines.slice(0, CHANNEL_HINT_RESERVED_LINES);
}

function wrapHintLines(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
    }

    current = word;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}
function GeneratingContent(): React.ReactElement {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);

    return () => clearInterval(t);
  }, []);

  // Hold each tagline for ~3s before rotating. The orb keeps moving; this
  // gives the user words for what's happening without re-rendering a spinner
  // line right above the orb.
  const tagline = TAGLINES[Math.floor(elapsed / 3) % TAGLINES.length];

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color="white" bold>
          Crafting your agent
        </Text>
        <Text dimColor>· {elapsed}s</Text>
      </Box>
      <Text dimColor>{tagline}</Text>
    </Box>
  );
}

function truncateInline(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 1)}…`;
}

function DashboardChannelReadyContent({
  channel,
  agentDetailsUrl,
  onContinue,
}: {
  channel: ChannelChoice;
  agentDetailsUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  const channelLabel = channelDisplayName(channel);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Continue in Novu Connect</Text>
      <Text dimColor>
        {channelLabel} setup is not available in the CLI yet. Press Enter to open your agent in Novu Connect and finish
        connecting there.
      </Text>
      <CopyableLink url={agentDetailsUrl} hint="Or open this link:" />
      <Text dimColor>Press Enter to open Novu Connect →</Text>
    </Box>
  );
}

function AgentChatHandoffContent({
  dashboardUrl,
  onContinue,
}: {
  dashboardUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Agent Chat linked</Text>
      <Text dimColor>Open the dashboard chat, or continue to add Agent Chat to your app.</Text>
      <CopyableLink url={dashboardUrl} hint="Chat tab in dashboard:" hyperlink={false} />
      <Text dimColor>Press Enter to continue</Text>
    </Box>
  );
}

function AgentChatSetupPickContent({
  projectKind,
  onResolve,
}: {
  projectKind: 'empty' | 'project';
  onResolve: (mode: AgentChatSetupMode) => void;
}): React.ReactElement {
  const options =
    projectKind === 'empty'
      ? [
          { label: 'Scaffold a new example app', value: 'scaffold' as const },
          { label: 'Add to my existing app (env + AI prompt)', value: 'embed' as const },
          { label: 'Skip for now', value: 'skip' as const },
        ]
      : [
          { label: 'Add to this project (env + AI prompt)', value: 'embed' as const },
          { label: 'Scaffold a new example app nearby', value: 'scaffold' as const },
          { label: 'Skip for now', value: 'skip' as const },
        ];
  const [idx, setIdx] = React.useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setIdx((current) => (current - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setIdx((current) => (current + 1) % options.length);
    } else if (key.return) {
      onResolve(options[idx].value);
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Add Agent Chat to your app</Text>
      <Text dimColor>
        {projectKind === 'empty'
          ? 'Scaffold a standalone example, or add env vars + an AI prompt for your existing app.'
          : 'We found an existing project. Add env vars + a copy-paste prompt, or scaffold a new example app.'}
      </Text>
      {options.map((opt, rowIndex) => {
        const isSelected = rowIndex === idx;

        return (
          <Text key={opt.value}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '› ' : '  '}
              {opt.label}
            </Text>
          </Text>
        );
      })}
      <Text dimColor>↑↓ to move · Enter to select</Text>
    </Box>
  );
}

function AgentChatEmbedReadyContent({
  embedPrompt,
  embedPromptFile,
  envPaths,
  onContinue,
}: {
  embedPrompt: string;
  embedPromptFile?: string;
  envPaths: string[];
  onContinue: () => void;
}): React.ReactElement {
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');

  useInput((input, key) => {
    if (key.return) {
      onContinue();

      return;
    }

    if (input === 'c' || input === 'C') {
      void copyToClipboard(embedPrompt).then((ok) => setCopyState(ok ? 'copied' : 'failed'));
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Ready to wire Agent Chat</Text>
      <Text dimColor>Paste the prompt into Cursor, Claude Code, or your coding agent to finish wiring.</Text>
      {envPaths.map((envPath) => (
        <Text key={envPath} dimColor>{`Env: ${envPath}`}</Text>
      ))}
      <Box borderStyle="round" borderColor="gray" paddingX={1} paddingY={0}>
        <Text wrap="wrap">{embedPrompt}</Text>
      </Box>
      {copyState === 'copied' ? <Text color="green">✓ Prompt copied to clipboard.</Text> : null}
      {copyState === 'failed' && embedPromptFile ? (
        <Text color="yellow">Clipboard unavailable — the prompt is saved at {embedPromptFile}</Text>
      ) : null}
      {copyState === 'failed' && !embedPromptFile ? (
        <Text color="yellow">Clipboard unavailable — select and copy the prompt above.</Text>
      ) : null}
      <Text color="cyan">Enter · continue C · copy prompt</Text>
    </Box>
  );
}

function SuccessView({
  phase,
}: {
  phase: Extract<ReturnType<ConnectStore['phase']['get']>, { kind: 'success' }>;
}): React.ReactElement {
  const {
    agent,
    connectDashboardUrl,
    environmentSlug,
    connectedChannel,
    dashboardRedirectChannel,
    isKeyless,
    claimUrl,
    connectMode,
    chatSdkOutcome,
    aiSdkOutcome,
    langChainOutcome,
    agentChatHandoff,
    agentChatOutcome,
  } = phase;
  const destination = resolveConnectSuccessDestination({
    connectDashboardUrl,
    environmentSlug,
    agentIdentifier: agent.identifier,
    isKeyless,
    claimUrl,
  });

  const channelLabel = (() => {
    if (connectedChannel === 'slack') return 'Slack';
    if (connectedChannel === 'telegram') return 'Telegram';
    if (connectedChannel === 'email') return 'Email';
    if (connectedChannel === 'sendblue') return 'iMessage (Sendblue)';
    if (connectedChannel === 'whatsapp') return 'WhatsApp';
    if (connectedChannel === 'agent-chat') return 'Agent Chat';

    return null;
  })();
  const redirectChannelLabel = dashboardRedirectChannel ? channelDisplayName(dashboardRedirectChannel) : null;
  const scaffoldMessage = resolveBridgeSetupFollowUpMessage(connectMode, {
    chatSdk: chatSdkOutcome,
    aiSdk: aiSdkOutcome,
    langChain: langChainOutcome,
    customCode: phase.customCodeOutcome,
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">
        {connectedChannel === 'agent-chat' ? '✓ Agent Chat linked — add it to your app.' : '✓ Your agent is live.'}
      </Text>
      <Box flexDirection="column">
        <Text>
          <Text bold>Agent:</Text> {agent.name} <Text dimColor>({agent.identifier})</Text>
        </Text>
        {connectedChannel === 'agent-chat' ? (
          <>
            {agentChatHandoff?.dashboardUrl ? (
              <Text color="cyan">Try chat in the dashboard — link copied above.</Text>
            ) : null}
            {agentChatOutcome?.mode === 'embed' ? (
              <>
                {agentChatOutcome.envPaths?.map((envPath) => (
                  <Text key={envPath} dimColor>{`Env updated: ${envPath}`}</Text>
                ))}
                <Text dimColor>Press C on the previous screen to copy the AI prompt.</Text>
              </>
            ) : null}
            {agentChatOutcome?.projectDir && agentChatOutcome.mode === 'scaffold' ? (
              <Text color="cyan">Example app: {agentChatOutcome.projectDir}</Text>
            ) : null}
          </>
        ) : (
          renderSuccessChannelMessage(channelLabel, redirectChannelLabel)
        )}
        {scaffoldMessage ? <Text color="cyan">{scaffoldMessage}</Text> : null}
        {renderSuccessNextStep(destination)}
      </Box>
    </Box>
  );
}

function renderSuccessNextStep(destination: ConnectSuccessDestination): React.ReactElement {
  if (destination.kind === 'claim') {
    return (
      <>
        <Text>
          <Text bold>Claim your agent:</Text> {destination.url}
        </Text>
        <Text dimColor>Sign up to move your agent and conversation into your own account.</Text>
      </>
    );
  }

  if (destination.kind === 'unclaimed') {
    return <Text dimColor>{UNCLAIMED_KEYLESS_HINT}</Text>;
  }

  return (
    <Text>
      <Text bold>Dashboard:</Text> {destination.url}
    </Text>
  );
}

function renderSuccessChannelMessage(
  channelLabel: string | null,
  redirectChannelLabel: string | null
): React.ReactElement {
  if (channelLabel) {
    return <Text color="cyan">Check {channelLabel} — your agent just messaged you.</Text>;
  }

  if (redirectChannelLabel) {
    return <Text color="cyan">Finish {redirectChannelLabel} setup in Novu Connect — we opened it for you.</Text>;
  }

  return <Text dimColor>No channel connected. Run `npx novu connect` again to wire one up.</Text>;
}
