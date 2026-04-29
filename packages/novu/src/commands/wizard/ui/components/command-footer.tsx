import { Box, Text } from 'ink';
import React from 'react';
import { theme } from '../theme';

interface CommandFooterProps {
  width: number;
  model: string;
}

export function CommandFooter({ width, model }: CommandFooterProps): React.ReactElement {
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
        <Text color={theme.brand}>/</Text>
        <Text dimColor> for shortcuts</Text>
      </Box>
      <Box>
        <Text dimColor>{model}</Text>
      </Box>
    </Box>
  );
}
