import { Box, Text, useStdout } from 'ink';
import React from 'react';

export type DividerProps = {
  /** Display character for the rule. Defaults to a horizontal box-drawing line. */
  char?: string;
  /** When provided, overrides the auto-measured stdout width. */
  width?: number;
  marginTop?: number;
  marginBottom?: number;
  dim?: boolean;
};

export function Divider({
  char = '\u2500',
  width,
  marginTop,
  marginBottom,
  dim = true,
}: DividerProps): React.ReactElement {
  const { stdout } = useStdout();
  const cols = width ?? stdout?.columns ?? process.stdout.columns ?? 80;
  const safe = Math.max(8, cols - 2);

  return (
    <Box marginTop={marginTop} marginBottom={marginBottom}>
      <Text dimColor={dim}>{char.repeat(safe)}</Text>
    </Box>
  );
}
