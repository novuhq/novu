import { Select, Spinner, TextInput } from '@inkjs/ui';
import { Box, Text, useApp } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { ConnectStore } from './store';
import { useStore } from './use-store';

export interface AppProps {
  store: ConnectStore;
  /** Called by the app once it has mounted, so the controller can wire the Ink exit. */
  registerExit: (exit: () => void) => void;
}

const NEW_AGENT_VALUE = '__new__';

export function App({ store, registerExit }: AppProps): React.ReactElement {
  const phase = useStore(store.phase);
  const { exit } = useApp();

  React.useEffect(() => {
    registerExit(exit);
  }, [exit, registerExit]);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
      <Header />
      {renderPhase(phase)}
    </Box>
  );
}

function renderPhase(phase: ReturnType<ConnectStore['phase']['get']>): React.ReactElement {
  switch (phase.kind) {
    case 'auth':
      return (
        <Box flexDirection="column" gap={1}>
          <SpinnerLine label={phase.status} />
          {phase.dashboardUrl ? (
            <Box flexDirection="column">
              <Text dimColor>If your browser didn't open, visit:</Text>
              <Text color="cyan">{phase.dashboardUrl}</Text>
            </Box>
          ) : null}
        </Box>
      );

    case 'listing-agents':
      return <SpinnerLine label="Checking for existing agents…" />;

    case 'loading-integrations':
      return <SpinnerLine label="Looking up managed integrations…" />;

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
          <Text>Describe your agent</Text>
          <Text dimColor>
            e.g. a customer-support agent that books demos and escalates billing questions.
          </Text>
          <Box borderStyle="round" paddingX={1}>
            <TextInput
              placeholder="Describe what your agent should do…"
              onSubmit={(value) => phase.resolve(value)}
            />
          </Box>
          <Text dimColor>Press Enter to submit. Minimum 8 characters.</Text>
        </Box>
      );

    case 'generating':
      return <SpinnerLine label="Generating agent configuration…" />;

    case 'creating':
      return <SpinnerLine label={`Creating agent "${phase.name}"…`} />;

    case 'adding-slack':
      return <SpinnerLine label="Linking Slack to your agent…" />;

    case 'paste-slack-token':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Paste a Slack App Configuration Token</Text>
          <Text dimColor>
            Your Slack integration has no OAuth credentials yet. Novu can create the Slack app for you
            from a manifest if you paste a short-lived configuration token.
          </Text>
          <Box flexDirection="column">
            <Text dimColor>1. Visit </Text>
            <Text color="cyan">https://api.slack.com/apps</Text>
            <Text dimColor>2. Open “Your Apps” → “Manage” → “App Configuration Tokens”</Text>
            <Text dimColor>3. Generate a token for your workspace (starts with xoxe.xoxp-)</Text>
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
      return <SpinnerLine label="Creating Slack app from manifest…" />;

    case 'waiting-slack':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Authorize Slack to finish setup</Text>
          <Box flexDirection="column">
            <Text dimColor>Opened in your browser. If nothing happened, visit:</Text>
            <Text color="cyan">{phase.authorizeUrl}</Text>
          </Box>
          <SpinnerLine label="Waiting for Slack authorization…" />
        </Box>
      );

    case 'sending-welcome':
      return <SpinnerLine label="Asking your agent to say hello in Slack…" />;

    case 'success':
      return <SuccessView phase={phase} />;

    case 'error':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="red">✗ {phase.message}</Text>
        </Box>
      );

    default:
      // exhaustive check: TypeScript should narrow phase to `never` here.
      return <Text />;
  }
}

function Header(): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="magenta">
        novu connect
      </Text>
      <Text dimColor>Create a managed agent and connect it to Slack — all from your terminal.</Text>
    </Box>
  );
}

function SpinnerLine({ label }: { label: string }): React.ReactElement {
  return (
    <Box gap={1}>
      <Spinner />
      <Text>{label}</Text>
    </Box>
  );
}

function SuccessView({
  phase,
}: {
  phase: Extract<ReturnType<ConnectStore['phase']['get']>, { kind: 'success' }>;
}): React.ReactElement {
  const { agent, dashboardUrl, environmentSlug, slackConnected } = phase;
  const agentUrl = environmentSlug
    ? `${dashboardUrl}/env/${environmentSlug}/agents/${encodeURIComponent(agent.identifier)}`
    : `${dashboardUrl}/agents/${encodeURIComponent(agent.identifier)}`;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Your agent is live.</Text>
      <Box flexDirection="column">
        <Text>
          <Text bold>Agent:</Text> {agent.name} <Text dimColor>({agent.identifier})</Text>
        </Text>
        {slackConnected ? (
          <Text color="cyan">Check Slack — your agent just messaged you.</Text>
        ) : (
          <Text dimColor>Skipped Slack. Run `npx novu connect` again to wire it up.</Text>
        )}
        <Text>
          <Text bold>Dashboard:</Text> {agentUrl}
        </Text>
      </Box>
    </Box>
  );
}

