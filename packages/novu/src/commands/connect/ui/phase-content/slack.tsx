import { TextInput } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { validateSlackConfigTokenFormat } from '../../pipeline/channels/slack-config-token';
import { CopyableLink } from '../copyable-link';
import type { Phase } from '../store';

export function PasteSlackConfigTokenContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'paste-slack-token' }>;
}): React.ReactElement {
  const [inputError, setInputError] = React.useState<string | undefined>();
  const displayError = phase.verificationError ?? inputError;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Paste a Slack App Configuration Token</Text>
      <Text dimColor>
        Your Slack integration has no OAuth credentials yet. Novu can create the Slack app for you from a manifest if
        you paste a short-lived configuration token — not your bot token (xoxb-).
      </Text>
      <Box flexDirection="column">
        <Text dimColor>1. Open </Text>
        <Text color="cyan">https://api.slack.com/apps</Text>
        <Text dimColor>2. Scroll to the bottom of the page</Text>
        <Text dimColor>3. Generate an App Configuration Token</Text>
        <Text dimColor>4. Copy the access token (starts with xoxe.xoxp-)</Text>
      </Box>
      {displayError ? <Text color="yellow">{displayError}</Text> : null}
      {phase.retry && !displayError ? (
        <Text color="yellow">Previous token was rejected by Slack. Generate a fresh one and try again.</Text>
      ) : null}
      <Box borderStyle="round" paddingX={1}>
        <TextInput
          placeholder="xoxe.xoxp-…"
          onSubmit={(value) => {
            const formatError = validateSlackConfigTokenFormat(value);
            if (formatError) {
              setInputError(formatError);

              return;
            }

            setInputError(undefined);
            phase.resolve(value.trim());
          }}
        />
      </Box>
      <Text dimColor>The token is sent to your Novu API once, used to create the Slack app, then discarded.</Text>
    </Box>
  );
}

export function SlackOAuthReadyContent({
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

export function WaitingSlackContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'waiting-slack' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Authorize Slack to finish setup</Text>
      <CopyableLink url={phase.authorizeUrl} hint="Opened in your browser. If nothing happened, visit:" />
      <Text dimColor>Waiting for Slack authorization…</Text>
    </Box>
  );
}
