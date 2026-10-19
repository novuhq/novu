import { Box } from 'ink';
import React from 'react';
import { useStdoutDimensions } from '../hooks/use-stdout-dimensions';
import { DissolveTransition } from './dissolve-transition';
import { ScreenErrorBoundary } from './screen-error-boundary';
import { WizardHeader } from './wizard-header';

export type ScreenContainerProps = {
  /** Stable token identifying the active screen — also drives transition remounts. */
  screenKey: string;
  children: React.ReactNode;
  onError?: (error: Error) => void;
  /** Optional override for the persistent top-bar label. */
  headerLabel?: string;
  /** Set to `false` to suppress the persistent header for a specific screen. */
  showHeader?: boolean;
  /**
   * Wall-clock timestamp the wizard run kicked off. When set, the header
   * renders an always-on elapsed timer on the right side of the brand band.
   */
  startedAt?: number;
};

const HEADER_ROWS = 1;
const MIN_ROWS = 10;
const MIN_COLS = 40;

/**
 * Pins the wizard to a fixed `rows × cols` frame so Ink never emits a frame
 * taller than the terminal — that's what was scrolling `WizardHeader` off the
 * top of the alt-screen buffer. The header lives inside this frame (above
 * the clipped child area) so every screen gets it for free, and the inner
 * Box uses `overflow="hidden"` to prevent any single screen from pushing
 * past the available rows.
 */
export function ScreenContainer({
  screenKey,
  children,
  onError,
  headerLabel,
  showHeader = true,
  startedAt,
}: ScreenContainerProps): React.ReactElement {
  const [columns, rows] = useStdoutDimensions();
  const width = Math.max(MIN_COLS, columns);
  const height = Math.max(MIN_ROWS, rows);
  const headerRows = showHeader ? HEADER_ROWS : 0;
  const bodyHeight = Math.max(MIN_ROWS - headerRows, height - headerRows);

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      {showHeader ? <WizardHeader width={width} label={headerLabel} startedAt={startedAt} /> : null}
      <Box flexDirection="column" width={width} height={bodyHeight} flexShrink={0} overflow="hidden">
        <ScreenErrorBoundary onError={onError}>
          <DissolveTransition token={screenKey}>{children}</DissolveTransition>
        </ScreenErrorBoundary>
      </Box>
    </Box>
  );
}
