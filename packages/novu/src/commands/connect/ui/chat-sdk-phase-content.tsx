import { TextInput } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { ChatSdkRequirement } from '../types';
import { ConfirmScaffoldContent } from './confirm-scaffold-content';
import type { Phase } from './store';

const CHAT_SDK_PHASE_KINDS = [
  'confirm-env-secret-overwrite',
  'confirm-scaffold',
  'prompt-agent-name',
  'scaffolding-bridge',
  'chat-sdk-install-deps-confirm',
  'chat-sdk-install-deps',
  'chat-sdk-reconcile-plan',
  'chat-sdk-tunnel-offer',
] as const;

type ChatSdkPhaseKind = (typeof CHAT_SDK_PHASE_KINDS)[number];

export type ChatSdkPhase = Extract<Phase, { kind: ChatSdkPhaseKind }>;

export function isChatSdkPhase(phase: Phase): phase is ChatSdkPhase {
  return (CHAT_SDK_PHASE_KINDS as readonly string[]).includes(phase.kind);
}

export function ChatSdkPhaseContent({ phase }: { phase: ChatSdkPhase }): React.ReactElement {
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
      return (
        <ConfirmScaffoldContent
          projectDir={phase.projectDir}
          appName={phase.appName}
          variant={phase.variant ?? 'chat-sdk'}
          onResolve={phase.resolve}
        />
      );

    case 'prompt-agent-name':
      return <PromptAgentNameContent defaultName={phase.defaultName} onResolve={phase.resolve} />;

    case 'scaffolding-bridge':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">
            {phase.variant === 'custom-code' ? 'Scaffolding your agent app…' : 'Scaffolding your Chat SDK app…'}
          </Text>
          <Text dimColor>Installing dependencies — this may take a minute.</Text>
        </Box>
      );

    case 'chat-sdk-install-deps-confirm':
      return <ChatSdkInstallDepsConfirmContent phase={phase} />;

    case 'chat-sdk-install-deps':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">Installing Chat SDK packages…</Text>
        </Box>
      );

    case 'chat-sdk-reconcile-plan':
      return <ChatSdkReconcilePlanContent phase={phase} />;

    case 'chat-sdk-tunnel-offer':
      return <ChatSdkTunnelOfferContent phase={phase} />;

    default: {
      const _exhaustive: never = phase;

      return <Text />;
    }
  }
}

function requirementIcon(req: ChatSdkRequirement): string {
  if (req.status === 'ok') {
    return '✓';
  }

  if (req.status === 'manual') {
    return '☐';
  }

  return '…';
}

function ChatSdkReconcilePlanContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'chat-sdk-reconcile-plan' }>;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) {
      phase.resolve();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Chat SDK project setup</Text>
      <Text dimColor>{phase.projectDir}</Text>
      {phase.requirements.map((req) => (
        <Text key={req.id}>
          {requirementIcon(req)} {req.id}: {req.detail}
        </Text>
      ))}
      {phase.envPaths.map((envPath) => (
        <Text key={envPath} dimColor>{`Env: ${envPath}`}</Text>
      ))}
      {phase.wiringInstructions ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Code wiring (manual)</Text>
          <Box borderStyle="round" borderColor="gray" paddingX={1} paddingY={0}>
            <Text wrap="wrap">{phase.wiringInstructions}</Text>
          </Box>
        </Box>
      ) : null}
      <Text color="cyan">Enter · continue</Text>
    </Box>
  );
}

function ChatSdkInstallDepsConfirmContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'chat-sdk-install-deps-confirm' }>;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) {
      phase.resolve(true);
    }
    if (key.escape) {
      phase.resolve(false);
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Install Chat SDK packages?</Text>
      <Text dimColor>We'll add: {phase.packages.join(', ')}</Text>
      <Text color="cyan">{phase.installCommand}</Text>
      <Text color="cyan">Enter · install · Esc · skip</Text>
    </Box>
  );
}

function ChatSdkTunnelOfferContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'chat-sdk-tunnel-offer' }>;
}): React.ReactElement {
  useInput((input, key) => {
    if (key.return) {
      phase.resolve('accept');
    }
    if (input === 's' || input === 'S') {
      phase.resolve('skip');
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Start the dev tunnel?</Text>
      <Text dimColor>Runs your app and registers a public bridge URL with Novu.</Text>
      <Text color="cyan">{phase.devCommand}</Text>
      <Text color="cyan">Enter · start tunnel · s · skip</Text>
    </Box>
  );
}

function PromptAgentNameContent({
  defaultName,
  onResolve,
}: {
  defaultName: string;
  onResolve: (name: string) => void;
}): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Name your Chat SDK agent</Text>
      <Text dimColor>This creates a self-hosted bridge agent in Novu — your app is the brain.</Text>
      <Box borderStyle="round" paddingX={1}>
        <TextInput
          defaultValue={defaultName}
          placeholder="My Chat SDK Agent"
          onSubmit={(value) => onResolve(value.trim() || defaultName)}
        />
      </Box>
      <Text dimColor>Press Enter to continue.</Text>
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
