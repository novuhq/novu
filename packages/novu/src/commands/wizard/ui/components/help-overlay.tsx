import figures from 'figures';
import { Box, Text, useInput } from 'ink';
import React from 'react';
import { SLASH_COMMANDS } from '../slash-commands';
import { theme } from '../theme';

export interface HelpOverlayProps {
  width: number;
  height: number;
  onDismiss: () => void;
}

export function HelpOverlay({ width, height, onDismiss }: HelpOverlayProps): React.ReactElement {
  useInput((input, key) => {
    if (key.escape || input === 'q') onDismiss();
  });

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      borderColor={theme.brand}
      paddingX={1}
    >
      <Text bold color={theme.brand}>
        {figures.bullet} Wizard commands & shortcuts
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>slash commands</Text>
        {SLASH_COMMANDS.map((cmd) => (
          <Text key={cmd.name}>
            <Text color={theme.brand}>{cmd.name}</Text> <Text dimColor>{cmd.description}</Text>
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>keybindings</Text>
        <Text>
          <Text color={theme.brand}>esc</Text> <Text dimColor>close any overlay</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>ctrl+c</Text> <Text dimColor>cancel the wizard</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press esc or q to close</Text>
      </Box>
    </Box>
  );
}
