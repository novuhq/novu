import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { CopyableLink } from '../copyable-link';
import type { Phase } from '../store';

export function WhatsAppSignupReadyContent({
  signupUrl,
  onContinue,
}: {
  signupUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Connect your WhatsApp Business account
      </Text>
      <Text dimColor>
        We'll open a Novu page with a "Log in with Facebook" button. Meta walks you through sharing your WhatsApp
        Business account — Novu saves the credentials and registers the webhook automatically.
      </Text>
      <Text dimColor>{`Signup page: ${signupUrl.slice(0, 80)}${signupUrl.length > 80 ? '…' : ''}`}</Text>
      <Text color="cyan">Press Enter to open the signup page in your browser →</Text>
    </Box>
  );
}

export function WhatsAppSignupWaitingContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'whatsapp-signup-waiting' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Finish WhatsApp signup in your browser</Text>
      <CopyableLink url={phase.signupUrl} hint="Opened in your browser. If nothing happened, visit:" />
      <Text dimColor>Waiting for Meta Embedded Signup to complete… (this can take a few minutes)</Text>
    </Box>
  );
}

export function WhatsAppTestContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'whatsapp-test' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Message your business number on WhatsApp
      </Text>
      <Text dimColor>
        {phase.displayPhoneNumber ? (
          <>
            Send any message to <Text color="white">{phase.displayPhoneNumber}</Text> from your phone — Novu confirms
            the connection as soon as it arrives.
          </>
        ) : (
          'Send any WhatsApp message to your business number from your phone — Novu confirms the connection as soon as it arrives.'
        )}
      </Text>
      {phase.waMeQr ? (
        <>
          <Text dimColor>Scan to open the chat on your phone:</Text>
          <Text>{phase.waMeQr}</Text>
        </>
      ) : null}
      {phase.waMeUrl ? <CopyableLink url={phase.waMeUrl} hint="Open WhatsApp directly:" /> : null}
      <Text dimColor>Waiting for your first inbound message…</Text>
    </Box>
  );
}
