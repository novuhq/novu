import { Box } from 'ink';
import React from 'react';

export type DissolveTransitionProps = {
  /**
   * Token that changes when the visible content swaps. The component uses it
   * as the React key to force a remount on transition, which is enough for a
   * single-frame "wipe" feel inside Ink without flicker.
   */
  token: string | number;
  children: React.ReactNode;
};

/**
 * Lightweight container that remounts its child whenever `token` changes.
 * Heavier wipe effects (column-by-column reveal) are not worth the budget
 * for a CLI screen swap — Ink redraws are already near-instant.
 */
export function DissolveTransition({ token, children }: DissolveTransitionProps): React.ReactElement {
  return (
    <Box key={String(token)} flexDirection="column" flexGrow={1}>
      {children}
    </Box>
  );
}
