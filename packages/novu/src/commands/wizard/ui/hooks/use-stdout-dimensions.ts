import { useStdout } from 'ink';
import React from 'react';

/**
 * Returns `[columns, rows]` for the active stdout stream and re-renders the
 * caller whenever the terminal is resized.
 *
 * Ink's built-in `useStdout()` exposes the underlying `WriteStream` but does
 * NOT subscribe to its `'resize'` event, so layout dimensions go stale the
 * moment the user resizes their terminal.
 */
export function useStdoutDimensions(): [number, number] {
  const { stdout } = useStdout();
  /**
   * Falls back to `process.stdout` (then 80×24) so the hook returns sensible
   * dimensions even when Ink's stdout context is unavailable — notably under
   * `renderToString`, which we use in `mountWizardUI` to snapshot the final
   * frame back to the user's terminal after the alternate screen restores.
   */
  const [size, setSize] = React.useState<[number, number]>(() => [
    stdout?.columns || process.stdout.columns || 80,
    stdout?.rows || process.stdout.rows || 24,
  ]);

  React.useEffect(() => {
    if (!stdout) return;

    const onResize = (): void => {
      const cols = stdout.columns || 80;
      const rows = stdout.rows || 24;
      if (cols > 0 && rows > 0) setSize([cols, rows]);
    };

    onResize();
    stdout.on('resize', onResize);

    return () => {
      stdout.off?.('resize', onResize);
    };
  }, [stdout]);

  return size;
}
