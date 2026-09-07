import { Box, Text } from 'ink';
import React from 'react';
import { useElapsed } from '../hooks/use-elapsed';
import { theme } from '../theme';
import { formatClock } from '../utils/format-duration';

export type WizardHeaderProps = {
  width: number;
  /** Optional override for the header label. */
  label?: string;
  /**
   * Wall-clock timestamp captured when the wizard started. When provided,
   * the header renders an always-on `MM:SS` (or `H:MM:SS`) elapsed timer
   * pinned to the right edge of the brand band. Pass `undefined` to hide.
   */
  startedAt?: number;
};

const DEFAULT_LABEL = 'Novu Wizard (beta)';

/**
 * Top header band: a single full-width line tinted with the
 * brand background color, with the wizard label left-aligned and an
 * optional elapsed timer right-aligned. Sits above every screen that
 * opts in (currently the run screen).
 *
 * Implementation note — the band is a single `Text` node with manual
 * padding rather than two flex children. Ink's `Box`/`Text` cannot share
 * a background color across siblings, so splitting the line would leave
 * a visible gap in the brand fill on terminals that don't blend
 * adjacent SGR runs.
 */
export function WizardHeader({ width, label = DEFAULT_LABEL, startedAt }: WizardHeaderProps): React.ReactElement {
  const elapsedMs = useElapsed(startedAt);
  const left = ` ${label}`;
  const right = startedAt !== undefined ? `${formatClock(elapsedMs)} ` : '';
  const minWidth = left.length + right.length + 1;
  const totalWidth = Math.max(width, minWidth);
  const middlePad = Math.max(totalWidth - left.length - right.length, 1);
  const padded = `${left}${' '.repeat(middlePad)}${right}`;

  return (
    <Box width={width} height={1} flexShrink={0}>
      <Text bold color="white" backgroundColor={theme.brand}>
        {padded}
      </Text>
    </Box>
  );
}
