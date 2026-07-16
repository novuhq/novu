import { PasswordInput, TextInput } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { CopyableLink } from '../copyable-link';
import type { Phase } from '../store';

export function SendblueIntroContent({
  dashboardUrl,
  onContinue,
}: {
  dashboardUrl: string;
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
        Connect iMessage with Sendblue
      </Text>
      <Text dimColor>
        You'll need a Sendblue account. Open your Sendblue dashboard to grab your API Key, Secret Key, and assigned
        phone number — we'll ask for them one at a time next.
      </Text>
      <CopyableLink url={dashboardUrl} hint="Sendblue API settings:" />
      <Text dimColor>Press Enter to continue →</Text>
    </Box>
  );
}

export function SendblueCredentialContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'sendblue-credential' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">{`Step ${phase.step} of ${phase.total} · ${phase.title}`}</Text>
      <Text dimColor>{phase.hint}</Text>
      <CopyableLink url={phase.dashboardUrl} hint="Find it in your Sendblue dashboard:" />
      {phase.verificationError ? <Text color="yellow">{phase.verificationError}</Text> : null}
      <Box borderStyle="round" paddingX={1}>
        {/* Keyed so each credential step remounts an empty input. */}
        {phase.secret ? (
          <PasswordInput
            key={`${phase.field}-${phase.step}`}
            placeholder={phase.placeholder}
            onSubmit={(value) => phase.resolve(value)}
          />
        ) : (
          <TextInput
            key={`${phase.field}-${phase.step}`}
            placeholder={phase.placeholder}
            onSubmit={(value) => phase.resolve(value)}
          />
        )}
      </Box>
      <Text dimColor>Press Enter to submit.</Text>
    </Box>
  );
}

export function SendblueWebhookManualContent({
  callbackUrl,
  webhookSecret,
  onContinue,
}: {
  callbackUrl: string;
  webhookSecret?: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') {
      onContinue();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="yellow">
        Finish the webhook in Sendblue
      </Text>
      <Text dimColor>
        We couldn't auto-register the webhook. In your Sendblue dashboard under API → Webhooks, add a `receive` webhook
        with this URL and signing secret:
      </Text>
      <CopyableLink url={callbackUrl} hint="Callback URL:" />
      {webhookSecret ? (
        <Text>
          <Text bold>Signing secret:</Text> {webhookSecret}
        </Text>
      ) : null}
      <Text dimColor>Press Enter once you've saved it →</Text>
    </Box>
  );
}

export function SendblueTestPhoneContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'sendblue-test-phone' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Send a test message
      </Text>
      <Text dimColor>
        Enter the phone number (E.164, e.g. +14155551234) to receive a test iMessage from{' '}
        <Text color="white">{phase.fromNumber}</Text>.
      </Text>
      {phase.verificationError ? <Text color="yellow">{phase.verificationError}</Text> : null}
      <Box borderStyle="round" paddingX={1}>
        <TextInput
          key={phase.defaultPhone ? `phone-${phase.defaultPhone}` : 'phone'}
          defaultValue={phase.defaultPhone ?? ''}
          placeholder="+14155551234"
          onSubmit={(value) => phase.resolve(value)}
        />
      </Box>
      <CopyableLink url={phase.imessageUrl} hint="Or text the bot directly via iMessage:" />
      <Text dimColor>Press Enter to send the test message.</Text>
    </Box>
  );
}

export function SendblueTestWaitingContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'sendblue-test-waiting' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Message your agent on iMessage
      </Text>
      <Text dimColor>
        Text <Text color="white">{phase.fromNumber}</Text> from your phone to start chatting. On Sendblue's shared
        lines you must message the number once before it can reply.
      </Text>
      <CopyableLink url={phase.imessageUrl} hint="Or open a pre-filled iMessage:" />
      <Text dimColor>Waiting for your first inbound message…</Text>
    </Box>
  );
}
