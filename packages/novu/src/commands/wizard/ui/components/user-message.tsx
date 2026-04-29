import { Box, Text } from 'ink';
import React from 'react';
import { Markdown } from '../markdown/render';
import { theme } from '../theme';

interface UserMessageProps {
  text: string;
  width: number;
}

export function UserMessage({ text, width }: UserMessageProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text bold color={theme.user}>
          you
        </Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        <Markdown source={text} width={Math.max(20, width - 2)} />
      </Box>
    </Box>
  );
}
