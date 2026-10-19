import { Box, useStdout } from 'ink';
import React from 'react';

export type SplitViewProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Width threshold (terminal columns) below which we collapse to single-column. */
  collapseAt?: number;
  /** Optional gap (in columns) between the two panes when side-by-side. */
  gap?: number;
};

const DEFAULT_COLLAPSE_AT = 80;

export function SplitView({
  left,
  right,
  collapseAt = DEFAULT_COLLAPSE_AT,
  gap = 2,
}: SplitViewProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? process.stdout.columns ?? 80;
  const isNarrow = columns < collapseAt;

  if (isNarrow) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        {right}
      </Box>
    );
  }

  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box flexDirection="column" width="50%" paddingRight={Math.max(0, Math.floor(gap / 2))}>
        {left}
      </Box>
      <Box flexDirection="column" width="50%" paddingLeft={Math.max(0, Math.floor(gap / 2))}>
        {right}
      </Box>
    </Box>
  );
}
