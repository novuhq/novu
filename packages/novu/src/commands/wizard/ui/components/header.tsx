import { Box, Text } from 'ink';
import React from 'react';
import { glyphs, theme } from '../theme';
import type { SessionState } from '../types';

interface HeaderProps {
  state: SessionState;
  width: number;
}

export function Header({ state, width }: HeaderProps): React.ReactElement {
  const region = state.options.region.toUpperCase();
  const env = state.auth?.environmentName ?? '\u2026';
  const meta = `${region} ${glyphs.bullet} env ${env}`;

  return (
    <Box
      width={width}
      height={2}
      flexShrink={0}
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderColor={theme.muted}
    >
      <Box>
        <Text bold color={theme.brand}>
          Novu Wizard
        </Text>
        <Text dimColor> (beta)</Text>
      </Box>
      <Box>
        <Text dimColor>{meta}</Text>
      </Box>
    </Box>
  );
}
