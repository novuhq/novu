import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { SEND_FROM_ACCOUNT_LABEL } from '../../copy/email-onboarding';
import { CopyableLink } from '../copyable-link';
import type { Phase } from '../store';

export function EmailReadyContent({
  inboundAddress,
  mailtoUrl,
  sendFromEmail,
  onContinue,
  onBack,
}: {
  inboundAddress: string;
  mailtoUrl: string;
  sendFromEmail?: string;
  onContinue: () => void;
  onBack?: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.escape && onBack) {
      onBack();
    } else if (key.return || _input === ' ') {
      onContinue();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Your agent has an inbox
      </Text>
      <Text dimColor>
        Unlike Slack or Telegram, email starts with you sending the first message. Your agent reads it and replies to
        the same inbox.
      </Text>
      <Box flexDirection="column" paddingY={1}>
        <Text dimColor>Inbound address:</Text>
        <Text bold>{inboundAddress}</Text>
      </Box>
      {sendFromEmail ? (
        <Text dimColor>
          Email agents reply to the address you send from. Use your Novu account email:{' '}
          <Text color="white" bold>
            {sendFromEmail}
          </Text>
        </Text>
      ) : null}
      <CopyableLink url={mailtoUrl} hint="Pre-filled draft email:" color="white" />
      <Text color="cyan">Press Enter to open a pre-filled draft in your default mail client →</Text>
      {onBack ? <Text dimColor>Esc · back to channel list</Text> : null}
    </Box>
  );
}

export function EmailWaitingContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'email-waiting' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Send any message to your agent
      </Text>
      <Box flexDirection="column" paddingY={1}>
        <Text bold>{phase.inboundAddress}</Text>
      </Box>
      {phase.sendFromEmail ? (
        <Text dimColor>
          {SEND_FROM_ACCOUNT_LABEL} <Text color="white">{phase.sendFromEmail}</Text>
        </Text>
      ) : null}
      <Text dimColor>Waiting for your email to arrive…</Text>
    </Box>
  );
}
