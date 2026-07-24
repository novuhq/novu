import figures from 'figures';
import { Box, Text, useInput } from 'ink';
import React from 'react';
import { type ScrollAction, useScrollKeys } from '../hooks/use-scroll-keys';
import { useStore } from '../hooks/use-store';
import type { LiveTailLine, WizardStore } from '../store';
import { theme } from '../theme';

export type LiveTailProps = {
  store: WizardStore;
  /** Maximum number of rows visible in the viewport. Defaults to 5. */
  maxRows?: number;
  /** When false, key + mouse handlers detach (overlay open, etc.). */
  isActive?: boolean;
};

/**
 * Bottom strip of the run screen. Renders the latest agent activity inside a
 * fixed-height viewport (`maxRows`) topped with a single-pixel divider, plus
 * keyboard and mouse-wheel scrollback over the deeper buffer kept by the
 * store.
 *
 * Auto-tails the newest line by default. The first scroll-up "pauses" the
 * viewport so incoming lines don't yank focus away from what the user is
 * reading; pressing `Esc`, jumping to the bottom (`Ctrl/Meta+↓`), or letting
 * the buffer scroll back to the live edge resumes tailing. The header
 * surfaces the pause state so the user always knows whether they're caught
 * up.
 *
 * Inputs use `useScrollKeys` in `'inline'` mode so the slash composer can
 * keep plain `↑/↓` for itself: scrolling needs `Shift+↑/↓`,
 * `Ctrl/Meta+↑/↓` for top/bottom, or the mouse wheel. `PgUp/PgDn` also
 * work but aren't surfaced in the hint to keep the strip compact.
 */
export function LiveTail({ store, maxRows = 5, isActive = true }: LiveTailProps): React.ReactElement {
  const lines = useStore(store.liveTail);
  const [offset, setOffset] = React.useState(0);

  const total = lines.length;
  const maxOffset = Math.max(0, total - maxRows);
  const clampedOffset = Math.min(offset, maxOffset);
  const isPaused = clampedOffset > 0;

  React.useEffect(() => {
    if (offset > maxOffset) setOffset(maxOffset);
  }, [offset, maxOffset]);

  const scroll = React.useCallback(
    (action: ScrollAction): void => {
      setOffset((prev) => applyAction(prev, action, maxOffset, maxRows));
    },
    [maxOffset, maxRows]
  );

  useScrollKeys(scroll, { isActive, mode: 'inline', mouse: true, wheelLines: 1 });

  useInput(
    (_input, key) => {
      if (key.escape && isPaused) setOffset(0);
    },
    { isActive }
  );

  const start = Math.max(0, total - maxRows - clampedOffset);
  const end = total - clampedOffset;
  const visible = lines.slice(start, end);
  const empty = visible.length === 0;

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={theme.muted}
      paddingTop={1}
      flexShrink={0}
    >
      <Box width="100%" justifyContent="space-between">
        <Text bold dimColor>
          Live tail
        </Text>
        <Text dimColor>{renderStatus(isPaused, clampedOffset, maxOffset)}</Text>
      </Box>
      <Box flexDirection="column" height={maxRows}>
        {empty ? (
          <Text dimColor>{figures.ellipsis} Waiting for agent activity…</Text>
        ) : (
          visible.map((line) => <LiveTailRow key={line.id} line={line} />)
        )}
      </Box>
    </Box>
  );
}

function LiveTailRow({ line }: { line: LiveTailLine }): React.ReactElement {
  const color = toneColor(line.tone);
  const dim = !line.tone || line.tone === 'info';

  return (
    <Text color={color} dimColor={dim} wrap="truncate-end">
      {figures.pointerSmall} {line.text}
    </Text>
  );
}

function renderStatus(isPaused: boolean, offset: number, maxOffset: number): string {
  if (isPaused) return `paused · -${offset}/${maxOffset} · esc to resume`;

  return 'shift+↑/↓ · wheel to scroll';
}

function toneColor(tone?: LiveTailLine['tone']): string | undefined {
  if (tone === 'ok') return theme.ok;
  if (tone === 'error') return theme.error;
  if (tone === 'warn') return theme.warn;

  return undefined;
}

function applyAction(prev: number, action: ScrollAction, maxOffset: number, page: number): number {
  switch (action) {
    case 'line-up':
      return Math.min(maxOffset, prev + 1);
    case 'line-down':
      return Math.max(0, prev - 1);
    case 'page-up':
      return Math.min(maxOffset, prev + page);
    case 'page-down':
      return Math.max(0, prev - page);
    case 'top':
      return maxOffset;
    case 'bottom':
      return 0;
    default:
      return prev;
  }
}
