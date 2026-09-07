import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { BridgeScaffoldVariant } from '../pipeline/bridge/types';

export function ConfirmScaffoldContent({
  projectDir,
  appName,
  variant,
  llmAuthLabel,
  onResolve,
}: {
  projectDir: string;
  appName: string;
  variant: BridgeScaffoldVariant;
  llmAuthLabel?: string;
  onResolve: (confirmed: boolean) => void;
}): React.ReactElement {
  const ignoreEnterRef = React.useRef(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      ignoreEnterRef.current = false;
    }, 75);

    return () => clearTimeout(timer);
  }, []);

  useInput((_input, key) => {
    if (key.return) {
      if (ignoreEnterRef.current) {
        return;
      }

      onResolve(true);
    }

    if (key.escape) {
      onResolve(false);
    }
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
        {llmAuthLabel ? (
          <Text>
            LLM wiring: <Text color="cyan">{llmAuthLabel}</Text>
          </Text>
        ) : null}
        <Text dimColor>
          This installs <Text color="white">@novu/framework</Text>, <Text color="white">Next.js</Text>, and wires your
          Novu credentials into <Text color="white">.env.local</Text>.
        </Text>
        <Text color="cyan">Enter · scaffold · Esc · cancel</Text>
      </Box>
    );
  }

  if (variant === 'ai-sdk') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Scaffold an AI SDK agent app?</Text>
        <Text dimColor>No project was found here. We'll create a Novu AI SDK agent app at:</Text>
        <Text>
          <Text bold>{projectDir}/</Text>
          <Text color="cyan">{appName}</Text>
        </Text>
        {llmAuthLabel ? (
          <Text>
            LLM wiring: <Text color="cyan">{llmAuthLabel}</Text>
          </Text>
        ) : null}
        <Text dimColor>
          This installs <Text color="white">@novu/framework</Text>, <Text color="white">Next.js</Text>, and wires your
          Novu credentials into <Text color="white">.env.local</Text>. Agent handlers use{' '}
          <Text color="white">@novu/framework/ai-sdk</Text>.
        </Text>
        <Text color="cyan">Enter · scaffold · Esc · cancel</Text>
      </Box>
    );
  }

  if (variant === 'langchain') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Scaffold a LangChain agent app?</Text>
        <Text dimColor>No project was found here. We'll create a Novu LangChain agent app at:</Text>
        <Text>
          <Text bold>{projectDir}/</Text>
          <Text color="cyan">{appName}</Text>
        </Text>
        {llmAuthLabel ? (
          <Text>
            LLM wiring: <Text color="cyan">{llmAuthLabel}</Text>
          </Text>
        ) : null}
        <Text dimColor>
          This installs <Text color="white">@novu/framework</Text>, <Text color="white">langchain</Text>,{' '}
          <Text color="white">Next.js</Text>, and wires your Novu credentials into <Text color="white">.env.local</Text>
          . Agent handlers use <Text color="white">@novu/framework/langchain</Text>.
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
