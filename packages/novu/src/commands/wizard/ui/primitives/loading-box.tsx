import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import { theme } from '../theme';

export type LoadingBoxProps = {
  message: string;
  hint?: string;
  color?: string;
};

export function LoadingBox({ message, hint, color = theme.brand }: LoadingBoxProps): React.ReactElement {
  return (
    <Box flexDirection="row" gap={1}>
      <Box>
        <Spinner />
      </Box>
      <Box flexDirection="column">
        <Text color={color}>{message}</Text>
        {hint ? <Text dimColor>{hint}</Text> : null}
      </Box>
    </Box>
  );
}
