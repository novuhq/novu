import path from 'node:path';
import { type ConnectEmbedRuntime, describeConnectEmbedPromptAction } from '@novu/shared';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import { copyToClipboard } from './copy-to-clipboard';

function formatEnvSummary(envPaths?: string[]): string | null {
  const paths = envPaths?.filter(Boolean) ?? [];
  if (paths.length === 0) {
    return null;
  }

  const names = [...new Set(paths.map((envPath) => path.basename(envPath)))];
  if (names.length === 1) {
    return names[0];
  }

  return names.join(', ');
}

export function WebChatEmbedFinishContent({
  embedPrompt,
  embedPromptFile,
  envPaths,
  connectMode,
  alreadyWired = false,
  onDismiss,
}: {
  embedPrompt: string;
  embedPromptFile?: string;
  envPaths?: string[];
  connectMode: ConnectEmbedRuntime;
  alreadyWired?: boolean;
  onDismiss?: () => void | Promise<void>;
}): React.ReactElement {
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const envSummary = formatEnvSummary(envPaths);
  const promptAction = describeConnectEmbedPromptAction(connectMode);

  useInput((input, key) => {
    if (onDismiss && key.return) {
      void Promise.resolve(onDismiss());

      return;
    }

    if (input === 'c' || input === 'C') {
      void copyToClipboard(embedPrompt).then((ok) => setCopyState(ok ? 'copied' : 'failed'));
    }
  });

  if (alreadyWired) {
    return (
      <Box flexDirection="column" gap={1}>
        {envSummary ? <Text dimColor>Refreshed {envSummary} with your Novu keys.</Text> : null}
        <Text>This project is already wired for Web Chat.</Text>
        {copyState === 'copied' ? (
          <Text color="green">✓ Copied — paste into your coding agent if you need to re-run setup.</Text>
        ) : (
          <Text dimColor>Run npm run dev:novu to start local dev.</Text>
        )}
        {copyState === 'failed' && embedPromptFile ? (
          <Text color="yellow">Clipboard unavailable — open {embedPromptFile}</Text>
        ) : null}
        {onDismiss ? <Text color="cyan">Enter · finish C · copy setup prompt anyway</Text> : null}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      {envSummary ? <Text dimColor>Updated {envSummary} with your Novu keys.</Text> : null}
      {copyState === 'copied' ? (
        <Text color="green">✓ Copied — paste into your coding agent.</Text>
      ) : (
        <Box flexDirection="column" gap={0}>
          <Text>
            <Text bold>Next:</Text> Press <Text bold>C</Text> to copy a setup prompt, then paste it into your coding
            agent.
          </Text>
          <Text dimColor>{promptAction}</Text>
        </Box>
      )}
      {copyState === 'failed' && embedPromptFile ? (
        <Text color="yellow">Clipboard unavailable — open {embedPromptFile}</Text>
      ) : null}
      {copyState === 'failed' && !embedPromptFile ? (
        <Text color="yellow">Clipboard unavailable — re-run connect to regenerate the prompt.</Text>
      ) : null}
      {onDismiss ? <Text color="cyan">C · copy prompt Enter · finish</Text> : null}
    </Box>
  );
}
