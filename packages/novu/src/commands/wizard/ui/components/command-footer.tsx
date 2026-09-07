import { Box, Text } from 'ink';
import React from 'react';
import { SLASH_COMMANDS } from '../slash-commands';
import { theme } from '../theme';

export interface CommandFooterProps {
  width: number;
  model: string;
  /** Active slash buffer (e.g. "/he"). Empty when the user isn't typing. */
  buffer?: string;
  /** When true, the inline buffer is rendered with a leading caret. */
  isActive?: boolean;
}

export function CommandFooter({ width, model, buffer = '', isActive = false }: CommandFooterProps): React.ReactElement {
  const hint = SLASH_COMMANDS.map((cmd) => cmd.name).join('  ');

  return (
    <Box
      width={width}
      height={2}
      flexShrink={0}
      paddingX={1}
      justifyContent="space-between"
      borderStyle="single"
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={theme.muted}
    >
      <Box>
        {isActive || buffer ? <Text color={theme.brand}>{buffer || '/'}</Text> : <Text dimColor>type {hint}</Text>}
      </Box>
      <Box>
        <Text dimColor>{model}</Text>
      </Box>
    </Box>
  );
}
