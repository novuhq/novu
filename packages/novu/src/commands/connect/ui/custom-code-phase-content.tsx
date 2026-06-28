import { Box, Text } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { Phase } from './store';

const CUSTOM_CODE_PHASE_KINDS = ['scaffolding-custom-code', 'custom-code-scaffolded'] as const;

type CustomCodePhaseKind = (typeof CUSTOM_CODE_PHASE_KINDS)[number];

export type CustomCodePhase = Extract<Phase, { kind: CustomCodePhaseKind }>;

export function isCustomCodePhase(phase: Phase): phase is CustomCodePhase {
  return (CUSTOM_CODE_PHASE_KINDS as readonly string[]).includes(phase.kind);
}

export function CustomCodePhaseContent({ phase }: { phase: CustomCodePhase }): React.ReactElement {
  switch (phase.kind) {
    case 'scaffolding-custom-code':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">Scaffolding your agent app…</Text>
          <Text dimColor>Installing dependencies — this may take a minute.</Text>
        </Box>
      );

    case 'custom-code-scaffolded':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="green">✓ Agent project scaffolded.</Text>
          <Text>
            <Text bold>Project:</Text> {phase.projectDir}
          </Text>
          <Text dimColor>{`Agent handler: ${phase.agentFilePath}`}</Text>
          {phase.skippedInstall ? (
            <Box flexDirection="column">
              <Text color="yellow">⚠ Detected a parent workspace — npm install was skipped.</Text>
              <Text dimColor>Run this to install dependencies before starting the app:</Text>
              <Text color="cyan">{`  cd ${phase.projectDir} && npm install`}</Text>
            </Box>
          ) : null}
        </Box>
      );

    default: {
      const _exhaustive: never = phase;

      return <Text />;
    }
  }
}
