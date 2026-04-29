import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { glyphs, theme } from '../theme';
import type { SessionState } from '../types';

interface BootScreenProps {
  state: SessionState;
  width: number;
}

export function BootScreen({ state, width }: BootScreenProps): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1} width={width} marginTop={1}>
      <Box>
        <Text bold color={theme.brand}>
          Authorising via the Novu Dashboard{glyphs.spinner}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.brand}>
          <Spinner type="dots" />
        </Text>
        <Text dimColor> {state.authMessage ?? 'Open the dashboard tab to confirm the device code.'}</Text>
      </Box>
    </Box>
  );
}
