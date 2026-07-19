import { Select } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { CopyableLink } from '../copyable-link';
import type { Phase } from '../store';

export function TelegramIntroContent({
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

export function PickTelegramTokenDeliveryContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'pick-telegram-token-delivery' }>;
}): React.ReactElement {
  const options = [
    { label: 'Scan QR / open setup page', value: 'setup-page' as const },
    { label: 'Paste the bot token here', value: 'terminal' as const },
  ];

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>How do you want to save your bot token?</Text>
      <Text dimColor>Scan the QR on your phone, or paste the token directly in this terminal.</Text>
      <Select options={options} onChange={(value) => phase.resolve(value as 'setup-page' | 'terminal')} />
    </Box>
  );
}

export function TelegramLinkTokenContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'telegram-link-token' }>;
}): React.ReactElement {
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
      <CopyableLink url={phase.mobileUrl} hint="Or open this on your phone:" />
      <Text dimColor>Waiting for your bot token…</Text>
    </Box>
  );
}

export function TelegramTestContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'telegram-test' }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 3 of 3 · Say hello to your bot
      </Text>
      <Text dimColor>
        Scan to open <Text color="white">@{phase.botUsername}</Text> in Telegram and tap Start.
      </Text>
      <Text>{phase.deepLinkQr}</Text>
      <CopyableLink url={phase.deepLinkUrl} hint="Or open this link:" />
      <Text dimColor>Waiting for /start in Telegram…</Text>
    </Box>
  );
}
