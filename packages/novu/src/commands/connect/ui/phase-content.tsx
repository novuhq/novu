import { Select, TextInput } from '@inkjs/ui';
import { AWS_CLAUDE_COMMERCIAL_REGIONS } from '@novu/shared';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { channelDisplayName, isDashboardOnlyChannel } from '../dashboard-urls';
import type { AgentRuntimeChoice, ChannelChoice } from '../types';
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
  switch (phase.kind) {
    case 'welcome':
      return <WelcomeContent onContinue={phase.resolve} />;

    case 'auth':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">{phase.status}</Text>
          {phase.dashboardUrl ? (
            <Box flexDirection="column">
              <Text dimColor>If your browser didn't open, visit:</Text>
              <Text color="cyan">{phase.dashboardUrl}</Text>
            </Box>
          ) : null}
        </Box>
      );

    case 'listing-agents':
      return <Text color="cyan">Checking for existing agents…</Text>;

    case 'loading-integrations':
      return <Text color="cyan">Looking up agent runtime integrations…</Text>;

    case 'pick-runtime':
      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text bold>Where do you want the agent to run?</Text>
            <Text dimColor>Choose the agent runtime. Novu connects it to Slack, email, and more.</Text>
          </Box>
          <RuntimeSelect onChange={(value) => phase.resolve(value)} />
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
            <TextInput placeholder={phase.placeholder} onSubmit={(value) => phase.resolve(value)} />
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
      const options: Array<{ label: string; value: ChannelChoice }> = [
        { label: 'Slack (recommended)', value: 'slack' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Email', value: 'email' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Microsoft Teams', value: 'teams' },
        { label: 'Skip — set up later in dashboard', value: 'skip' },
      ];

      return (
        <Box flexDirection="column" gap={1} alignItems="flex-start">
          <Text bold wrap="wrap">
            Pick a channel to connect this agent to
          </Text>
          <ChannelSelect options={options} onChange={(value) => phase.resolve(value)} onHighlight={onChannelHover} />
        </Box>
      );
    }

    case 'adding-slack':
      return <Text color="cyan">Linking Slack to your agent…</Text>;

    case 'paste-slack-token':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Paste a Slack App Configuration Token</Text>
          <Text dimColor>
            Your Slack integration has no OAuth credentials yet. Novu can create the Slack app for you from a manifest
            if you paste a short-lived configuration token.
          </Text>
          <Box flexDirection="column">
            <Text dimColor>1. Open </Text>
            <Text color="cyan">https://api.slack.com/apps</Text>
            <Text dimColor>2. Scroll to the bottom of the page</Text>
            <Text dimColor>3. Generate an App Configuration Token</Text>
            <Text dimColor>4. Copy the access token (starts with xoxe.xoxp-)</Text>
          </Box>
          {phase.retry ? (
            <Text color="yellow">Previous token was rejected by Slack. Generate a fresh one and try again.</Text>
          ) : null}
          <Box borderStyle="round" paddingX={1}>
            <TextInput
              placeholder="xoxe.xoxp-…"
              onSubmit={(value) => {
                const trimmed = value.trim();
                if (!trimmed) {
                  phase.reject(new Error('No Slack App Configuration Token provided.'));

                  return;
                }
                phase.resolve(trimmed);
              }}
            />
          </Box>
          <Text dimColor>The token is sent to your Novu API once, used to create the Slack app, then discarded.</Text>
        </Box>
      );

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
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Authorize Slack to finish setup</Text>
          <Box flexDirection="column">
            <Text dimColor>Opened in your browser. If nothing happened, visit:</Text>
            <Text color="cyan">{phase.authorizeUrl}</Text>
          </Box>
          <Text dimColor>Waiting for Slack authorization…</Text>
        </Box>
      );

    case 'adding-email':
      return <Text color="cyan">Linking Email to your agent…</Text>;

    case 'email-ready':
      return (
        <EmailReadyContent
          inboundAddress={phase.inboundAddress}
          mailtoUrl={phase.mailtoUrl}
          onContinue={phase.resolve}
        />
      );

    case 'email-waiting':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">
            Send any message to your agent
          </Text>
          <Box flexDirection="column" paddingY={1}>
            <Text bold>{phase.inboundAddress}</Text>
          </Box>
          <Text dimColor>Waiting for your email to arrive…</Text>
        </Box>
      );

    case 'adding-telegram':
      return <Text color="cyan">Linking Telegram to your agent…</Text>;

    case 'telegram-intro':
      return <TelegramIntroContent botfatherQr={phase.botfatherQr} onContinue={phase.resolve} />;

    case 'telegram-link-token':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">
            Step 2 of 3 · Save your bot token
          </Text>
          <Text dimColor>
            Scan with your phone to open a page where you can paste the BotFather token. We'll handle registering the
            webhook for you.
          </Text>
          <Text>{phase.mobileQr}</Text>
          <Box flexDirection="column">
            <Text dimColor>Or open this on your phone:</Text>
            <Text color="cyan">{phase.mobileUrl}</Text>
          </Box>
          <Text dimColor>Waiting for your bot token…</Text>
        </Box>
      );

    case 'telegram-test':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">
            Step 3 of 3 · Say hello to your bot
          </Text>
          <Text dimColor>
            Scan to open <Text color="white">@{phase.botUsername}</Text> in Telegram and tap Start.
          </Text>
          <Text>{phase.deepLinkQr}</Text>
          <Box flexDirection="column">
            <Text dimColor>Or open this link:</Text>
            <Text color="cyan">{phase.deepLinkUrl}</Text>
          </Box>
          <Text dimColor>Waiting for /start in Telegram…</Text>
        </Box>
      );

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

    default:
      return <Text />;
  }
}

function RuntimeSelect({ onChange }: { onChange: (value: AgentRuntimeChoice) => void }): React.ReactElement {
  const options: Array<{ value: AgentRuntimeChoice; title: string; detail?: string }> = [
    { value: 'demo', title: 'Demo Credentials', detail: '10 conversations per month' },
    { value: 'claude', title: 'Claude Managed Agents' },
    { value: 'claude-aws', title: 'AWS Claude Managed Agents' },
  ];
  const [idx, setIdx] = React.useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setIdx((current) => (current - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setIdx((current) => (current + 1) % options.length);
    } else if (key.return) {
      onChange(options[idx].value);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, i) => {
        const isSelected = i === idx;

        return (
          <Text key={opt.value}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '› ' : '  '}
              {opt.title}
            </Text>
            {opt.detail ? <Text dimColor>{` · ${opt.detail}`}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}

const DASHBOARD_CHANNEL_HINT = 'Onboarding for this channel is currently only available in the Novu Connect UI.';
/** Keeps the picker + hint from widening the centered layout when the hint appears. */
const CHANNEL_PICKER_WIDTH = 48;

function ChannelSelect({
  options,
  onChange,
  onHighlight,
}: {
  options: Array<{ label: string; value: ChannelChoice }>;
  onChange: (value: ChannelChoice) => void;
  onHighlight: (value: ChannelChoice | null) => void;
}): React.ReactElement {
  const [idx, setIdx] = React.useState(0);

  // Seed the parent with the initial highlight so the orb doesn't sit on
  // white for a frame before the user touches the arrow keys.
  React.useEffect(() => {
    onHighlight(options[0]?.value ?? null);
    // We only want to fire on mount; subsequent highlights flow through useInput.
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  }, []);

  useInput((_input, key) => {
    if (key.upArrow) {
      const next = (idx - 1 + options.length) % options.length;
      setIdx(next);
      onHighlight(options[next].value);
    } else if (key.downArrow) {
      const next = (idx + 1) % options.length;
      setIdx(next);
      onHighlight(options[next].value);
    } else if (key.return) {
      onChange(options[idx].value);
    }
  });

  const highlighted = options[idx]?.value ?? null;
  const showDashboardHint = highlighted !== null && isDashboardOnlyChannel(highlighted);

  return (
    <Box flexDirection="column" gap={1} alignItems="flex-start">
      <Box flexDirection="column" alignItems="flex-start">
        {options.map((opt, i) => {
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
        {showDashboardHint ? (
          <Text dimColor wrap="wrap">
            {DASHBOARD_CHANNEL_HINT}
          </Text>
        ) : (
          <>
            <Text> </Text>
            <Text> </Text>
          </>
        )}
      </Box>
    </Box>
  );
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

function SlackOAuthReadyContent({
  appCreated,
  authorizeUrl,
  onContinue,
}: {
  appCreated: boolean;
  authorizeUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  return (
    <Box flexDirection="column" gap={1}>
      {appCreated ? (
        <>
          <Text bold color="green">
            Slack app created successfully
          </Text>
          <Text dimColor>
            Novu created a Slack app for your agent. Next, add it to your workspace so your team can talk to the agent
            in Slack.
          </Text>
        </>
      ) : (
        <>
          <Text bold color="cyan">
            Connect Slack to your agent
          </Text>
          <Text dimColor>Authorize Novu to install the Slack app in your workspace.</Text>
        </>
      )}
      <Text dimColor>{`OAuth link: ${authorizeUrl.slice(0, 80)}${authorizeUrl.length > 80 ? '…' : ''}`}</Text>
      <Text color="cyan">Press Enter to open Slack and add the app to your workspace →</Text>
    </Box>
  );
}

function EmailReadyContent({
  inboundAddress,
  mailtoUrl,
  onContinue,
}: {
  inboundAddress: string;
  mailtoUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Your agent has an inbox
      </Text>
      <Text dimColor>Send any email to the address below — your agent will read it and reply to your inbox.</Text>
      <Box flexDirection="column" paddingY={1}>
        <Text bold>{inboundAddress}</Text>
      </Box>
      <Text dimColor>{`mailto link: ${mailtoUrl.slice(0, 80)}${mailtoUrl.length > 80 ? '…' : ''}`}</Text>
      <Text color="cyan">Press Enter to open a pre-filled draft in your default mail client →</Text>
    </Box>
  );
}

function TelegramIntroContent({
  botfatherQr,
  onContinue,
}: {
  botfatherQr: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') {
      onContinue();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 1 of 3 · Create your Telegram bot
      </Text>
      <Box flexDirection="column">
        <Text>
          <Text color="white" bold>
            1.
          </Text>{' '}
          Open Telegram and message <Text color="cyan">@BotFather</Text>.
        </Text>
        <Text>
          <Text color="white" bold>
            2.
          </Text>{' '}
          Run <Text color="magenta">/newbot</Text>, choose a name and username.
        </Text>
        <Text>
          <Text color="white" bold>
            3.
          </Text>{' '}
          Keep the BotFather chat open — you'll paste the token from there in the next step.
        </Text>
      </Box>
      <Text dimColor>Or scan to open BotFather on your phone:</Text>
      <Text>{botfatherQr}</Text>
      <Text dimColor>Press Enter when you have your bot token →</Text>
    </Box>
  );
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
      <Text color="cyan">{agentDetailsUrl}</Text>
      <Text dimColor>Press Enter to open Novu Connect →</Text>
    </Box>
  );
}

function SuccessView({
  phase,
}: {
  phase: Extract<ReturnType<ConnectStore['phase']['get']>, { kind: 'success' }>;
}): React.ReactElement {
  const { agent, connectDashboardUrl, environmentSlug, connectedChannel, dashboardRedirectChannel } = phase;
  const agentUrl = environmentSlug
    ? `${connectDashboardUrl}/env/${environmentSlug}/connect/agents/${encodeURIComponent(agent.identifier)}`
    : `${connectDashboardUrl}/connect/agents/${encodeURIComponent(agent.identifier)}`;

  const channelLabel = (() => {
    if (connectedChannel === 'slack') return 'Slack';
    if (connectedChannel === 'telegram') return 'Telegram';
    if (connectedChannel === 'email') return 'Email';

    return null;
  })();
  const redirectChannelLabel = dashboardRedirectChannel ? channelDisplayName(dashboardRedirectChannel) : null;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Your agent is live.</Text>
      <Box flexDirection="column">
        <Text>
          <Text bold>Agent:</Text> {agent.name} <Text dimColor>({agent.identifier})</Text>
        </Text>
        {renderSuccessChannelMessage(channelLabel, redirectChannelLabel)}
        <Text>
          <Text bold>Dashboard:</Text> {agentUrl}
        </Text>
      </Box>
    </Box>
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
