import { Box, useApp, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { ChannelChoice } from '../types';
import { PersistentOrb } from './orb/orb-renderer';
import { computeOrbLabel, computeOrbTint } from './orb/orb-tint';
import { usePreviewOrbMorph } from './orb/use-preview-orb-morph';
import { phaseHasCopyableUrl } from './phase-has-copyable-url';
import { PhaseContent } from './phase-content';
import type { ConnectStore } from './store';
import { useStore } from './use-store';

export interface AppProps {
  store: ConnectStore;
  /** Called by the app once it has mounted, so the controller can wire the Ink exit. */
  registerExit: (exit: () => void) => void;
}

export function App({ store, registerExit }: AppProps): React.ReactElement {
  const phase = useStore(store.phase);
  const { exit } = useApp();

  const [hoveredChannel, setHoveredChannel] = React.useState<ChannelChoice | null>(null);
  const { previewMorphProgress, previewMorphComplete } = usePreviewOrbMorph(phase.kind);

  React.useEffect(() => {
    registerExit(exit);
  }, [exit, registerExit]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exitCode = 130;
      exit();
    }
  });

  React.useEffect(() => {
    if (phase.kind !== 'pick-channel') setHoveredChannel(null);
  }, [phase.kind]);

  const tintColor = computeOrbTint(phase, hoveredChannel, previewMorphProgress);
  const label = computeOrbLabel(phase, hoveredChannel);
  const orbPaused = phaseHasCopyableUrl(phase);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1} alignItems="center">
      <PersistentOrb
        tintColor={tintColor}
        label={label}
        previewMorphProgress={phase.kind === 'preview-generated' ? previewMorphProgress : null}
        paused={orbPaused}
      />
      <PhaseContent phase={phase} onChannelHover={setHoveredChannel} previewMorphComplete={previewMorphComplete} />
    </Box>
  );
}
