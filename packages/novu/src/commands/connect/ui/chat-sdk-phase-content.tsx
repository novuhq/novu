import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { Phase } from './store';

export function ChatSdkPhaseContent({ phase }: { phase: Phase }): React.ReactElement | null {
  switch (phase.kind) {
    case 'confirm-env-secret-overwrite':
      return (
        <ConfirmEnvSecretOverwriteContent
          envPath={phase.envPath}
          existingMasked={phase.existingMasked}
          nextMasked={phase.nextMasked}
          onResolve={phase.resolve}
        />
      );

    case 'confirm-scaffold':
      return <ConfirmScaffoldContent projectDir={phase.projectDir} appName={phase.appName} onResolve={phase.resolve} />;

    case 'scaffolding-chat-sdk':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">Scaffolding your Chat SDK app…</Text>
          <Text dimColor>Installing dependencies — this may take a minute.</Text>
        </Box>
      );

    case 'chat-sdk-scaffolded':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="green">✓ Chat SDK project scaffolded.</Text>
          <Text>
            <Text bold>Project:</Text> {phase.projectDir}
          </Text>
          {phase.envPaths.map((envPath) => (
            <Text key={envPath} dimColor>{`Wrote ${envPath}`}</Text>
          ))}
          {phase.skippedInstall ? (
            <Box flexDirection="column">
              <Text color="yellow">⚠ Detected a parent workspace — npm install was skipped.</Text>
              <Text dimColor>Run this to install dependencies before starting the app:</Text>
              <Text color="cyan">{`  cd ${phase.projectDir} && npm install`}</Text>
            </Box>
          ) : null}
        </Box>
      );

    case 'chat-sdk-env-wired':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="green">✓ Environment updated.</Text>
          {phase.envPaths.map((envPath) => (
            <Text key={envPath} dimColor>{`Updated ${envPath}`}</Text>
          ))}
          {phase.updatedKeys.length > 0 ? <Text dimColor>{`Keys: ${phase.updatedKeys.join(', ')}`}</Text> : null}
        </Box>
      );

    case 'chat-sdk-skill-prompt':
      return <ChatSdkSkillPromptContent phase={phase} />;

    case 'chat-sdk-installing-skill':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">Installing novu-chat-sdk skill…</Text>
          <Text dimColor>Updating .env.local with your Novu credentials.</Text>
        </Box>
      );

    case 'chat-sdk-agent-prompt':
      return <ChatSdkAgentPromptContent phase={phase} />;

    default:
      return null;
  }
}

function ChatSdkSkillPromptContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'chat-sdk-skill-prompt' }>;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) phase.resolve(true);
    if (key.escape) phase.resolve(false);
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Install the novu-chat-sdk skill?</Text>
      <Text dimColor>
        We'll update <Text color="white">.env.local</Text> and install the <Text color="white">novu-chat-sdk</Text>{' '}
        skill into your project. You'll then get a prompt to paste into your coding agent to wire the adapter.
      </Text>
      <Text dimColor>
        Agent identifier: <Text color="cyan">{phase.agentIdentifier}</Text>
      </Text>
      <Text color="cyan">Enter · install skill · Esc · skip</Text>
    </Box>
  );
}

function ChatSdkAgentPromptContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'chat-sdk-agent-prompt' }>;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) phase.resolve();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Skill installed.</Text>
      {phase.envPaths.map((envPath) => (
        <Text key={envPath} dimColor>{`Updated ${envPath}`}</Text>
      ))}
      {phase.skillDestinations.map((dest) => (
        <Text key={dest} dimColor>{`Skill: ${dest}`}</Text>
      ))}
      <Text bold>Paste this into your coding agent:</Text>
      <Box borderStyle="round" borderColor="gray" paddingX={1} paddingY={0}>
        <Text wrap="wrap">{phase.agentPrompt}</Text>
      </Box>
      <Text color="cyan">Enter · continue when you've prompted your agent</Text>
    </Box>
  );
}

function ConfirmScaffoldContent({
  projectDir,
  appName,
  onResolve,
}: {
  projectDir: string;
  appName: string;
  onResolve: (confirmed: boolean) => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) onResolve(true);
    if (key.escape) onResolve(false);
  });

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

function ConfirmEnvSecretOverwriteContent({
  envPath,
  existingMasked,
  nextMasked,
  onResolve,
}: {
  envPath: string;
  existingMasked: string;
  nextMasked: string;
  onResolve: (overwrite: boolean) => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) onResolve(true);
    if (key.escape) onResolve(false);
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Overwrite NOVU_SECRET_KEY?</Text>
      <Text dimColor>{envPath} already has a secret key.</Text>
      <Text>
        Existing: <Text color="yellow">{existingMasked}</Text> → New: <Text color="cyan">{nextMasked}</Text>
      </Text>
      <Text color="cyan">Enter · overwrite · Esc · keep existing</Text>
    </Box>
  );
}
