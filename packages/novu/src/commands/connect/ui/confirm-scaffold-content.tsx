import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { BridgeScaffoldVariant } from '../pipeline/bridge/types';

export function ConfirmScaffoldContent({
  projectDir,
  appName,
  variant,
  onResolve,
}: {
  projectDir: string;
  appName: string;
  variant: BridgeScaffoldVariant;
  onResolve: (confirmed: boolean) => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) onResolve(true);
    if (key.escape) onResolve(false);
  });

  if (variant === 'custom-code') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Scaffold an agent app?</Text>
        <Text dimColor>No project was found here. We'll create a Novu bridge agent app at:</Text>
        <Text>
          <Text bold>{projectDir}/</Text>
          <Text color="cyan">{appName}</Text>
        </Text>
        <Text dimColor>
          This installs <Text color="white">@novu/framework</Text>, <Text color="white">Next.js</Text>, and wires your
          Novu credentials into <Text color="white">.env.local</Text>.
        </Text>
        <Text color="cyan">Enter · scaffold · Esc · cancel</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Scaffold a Chat SDK app?</Text>
      <Text dimColor>No Chat SDK project was found here. We'll create one at:</Text>
      <Text>
        <Text bold>{projectDir}/</Text>
        <Text color="cyan">{appName}</Text>
      </Text>
      <Text dimColor>
        This installs <Text color="white">chat</Text>, <Text color="white">@novu/chat-sdk-adapter</Text>, and wires your
        Novu credentials into <Text color="white">.env.local</Text>.
      </Text>
      <Text color="cyan">Enter · scaffold · Esc · cancel</Text>
    </Box>
  );
}
