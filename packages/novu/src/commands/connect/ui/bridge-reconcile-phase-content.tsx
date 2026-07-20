import { TextInput } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { BridgeScaffoldVariant } from '../pipeline/bridge/types';
import type { BridgeRequirement } from '../types';
import { installDepsPrompt, installingDepsMessage, reconcilePlanTitle } from './bridge-reconcile-variant';
import { ConfirmScaffoldContent } from './confirm-scaffold-content';
import { copyToClipboard } from './copy-to-clipboard';
import type { Phase } from './store';

const BRIDGE_RECONCILE_PHASE_KINDS = [
  'confirm-env-secret-overwrite',
  'confirm-scaffold',
  'prompt-agent-name',
  'scaffolding-bridge',
  'bridge-install-deps-confirm',
  'bridge-install-deps',
  'bridge-reconcile-plan',
  'bridge-tunnel-offer',
] as const;

type BridgeReconcilePhaseKind = (typeof BRIDGE_RECONCILE_PHASE_KINDS)[number];

export type BridgeReconcilePhase = Extract<Phase, { kind: BridgeReconcilePhaseKind }>;

export function isBridgeReconcilePhase(phase: Phase): phase is BridgeReconcilePhase {
  return (BRIDGE_RECONCILE_PHASE_KINDS as readonly string[]).includes(phase.kind);
}

export function BridgeReconcilePhaseContent({ phase }: { phase: BridgeReconcilePhase }): React.ReactElement {
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
          <Text color="cyan">{scaffoldingBridgeMessage(phase.variant)}</Text>
          <Text dimColor>Installing dependencies — this may take a minute.</Text>
        </Box>
      );

    case 'bridge-install-deps-confirm':
      return <BridgeInstallDepsConfirmContent phase={phase} />;

    case 'bridge-install-deps':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">{installingDepsMessage(phase.variant ?? 'chat-sdk')}</Text>
        </Box>
      );

    case 'bridge-reconcile-plan':
      return <BridgeReconcilePlanContent phase={phase} />;

    case 'bridge-tunnel-offer':
      return <BridgeTunnelOfferContent phase={phase} />;

    default: {
      const _exhaustive: never = phase;

      return <Text />;
    }
  }
}

function requirementIcon(req: BridgeRequirement): string {
  if (req.status === 'ok') {
    return '✓';
  }

  if (req.status === 'manual') {
    return '☐';
  }

  return '…';
}

function BridgeReconcilePlanContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'bridge-reconcile-plan' }>;
}): React.ReactElement {
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const canCopyPrompt = Boolean(phase.agentPrompt);

  useInput((input, key) => {
    if (key.return) {
      phase.resolve();

      return;
    }

    if (canCopyPrompt && (input === 'c' || input === 'C')) {
      const prompt = phase.agentPrompt ?? '';
      void copyToClipboard(prompt).then((ok) => setCopyState(ok ? 'copied' : 'failed'));
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{reconcilePlanTitle(phase.variant ?? 'chat-sdk')}</Text>
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
      {copyState === 'copied' ? (
        <Text color="green">✓ Agent prompt copied to clipboard — paste it into your coding agent.</Text>
      ) : null}
      {copyState === 'failed' && phase.requirementsFile ? (
        <Text color="yellow">Clipboard unavailable — the prompt is saved at {phase.requirementsFile}</Text>
      ) : null}
      <Text color="cyan">{canCopyPrompt ? 'Enter · continue    C · copy agent prompt' : 'Enter · continue'}</Text>
    </Box>
  );
}

function BridgeInstallDepsConfirmContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'bridge-install-deps-confirm' }>;
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
      <Text bold>{installDepsPrompt(phase.variant ?? 'chat-sdk')}</Text>
      <Text dimColor>We'll add: {phase.packages.join(', ')}</Text>
      <Text color="cyan">{phase.installCommand}</Text>
      <Text color="cyan">Enter · install · Esc · skip</Text>
    </Box>
  );
}

function BridgeTunnelOfferContent({
  phase,
}: {
  phase: Extract<Phase, { kind: 'bridge-tunnel-offer' }>;
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

function scaffoldingBridgeMessage(variant: BridgeScaffoldVariant): string {
  if (variant === 'custom-code') {
    return 'Scaffolding your agent app…';
  }

  if (variant === 'ai-sdk') {
    return 'Scaffolding your AI SDK agent app…';
  }

  if (variant === 'langchain') {
    return 'Scaffolding your LangChain agent app…';
  }

  return 'Scaffolding your Chat SDK app…';
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
      <Text bold>Name your bridge agent</Text>
      <Text dimColor>This creates a self-hosted bridge agent in Novu — your app is the brain.</Text>
      <Box borderStyle="round" paddingX={1}>
        <TextInput
          defaultValue={defaultName}
          placeholder="My Bridge Agent"
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
