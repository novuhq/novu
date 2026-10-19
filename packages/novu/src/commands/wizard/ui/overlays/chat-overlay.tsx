import figures from 'figures';
import { Box, Text, useInput, useStdout } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import React from 'react';
import { shortenToolName } from '../../agent/tool-labels';
import { applyScrollAction, type ScrollAction, useScrollKeys } from '../hooks/use-scroll-keys';
import { useStore } from '../hooks/use-store';
import { Markdown } from '../markdown/render';
import type { WizardStore } from '../store';
import { type TrailEntry, TrailKind } from '../store';
import { theme } from '../theme';

const MAX_DIFF_LINES = 24;

export interface ChatOverlayProps {
  store: WizardStore;
  width: number;
  height: number;
  onDismiss: () => void;
}

export function ChatOverlay({ store, width, height, onDismiss }: ChatOverlayProps): React.ReactElement {
  const trail = useStore(store.trail);
  const scrollRef = React.useRef<ScrollViewRef>(null);
  // Sticky-bottom: stay pinned to the latest activity unless the user has
  // intentionally scrolled away from the bottom. Defaults to `true` so the
  // overlay opens scrolled to the most recent entry; flips to `false` the
  // moment a scroll event reports an offset above the bottom, and flips
  // back to `true` once the user scrolls back to the bottom.
  const isStickyToBottomRef = React.useRef(true);
  const { stdout } = useStdout();

  React.useEffect(() => {
    const handler = () => scrollRef.current?.remeasure();
    stdout?.on('resize', handler);

    return () => {
      stdout?.off('resize', handler);
    };
  }, [stdout]);

  React.useEffect(() => {
    if (!isStickyToBottomRef.current) return;
    const id = setTimeout(() => scrollRef.current?.scrollToBottom(), 0);

    return () => clearTimeout(id);
  }, [trail.length]);

  const handleScroll = React.useCallback((offset: number) => {
    const ref = scrollRef.current;
    if (!ref) return;
    isStickyToBottomRef.current = offset >= ref.getBottomOffset();
  }, []);

  const scroll = React.useCallback((action: ScrollAction) => {
    applyScrollAction(scrollRef.current, action);
  }, []);
  useScrollKeys(scroll, { mode: 'overlay' });

  useInput((input, key) => {
    if (key.escape || input === 'q') onDismiss();
  });

  const innerWidth = Math.max(40, width - 4);
  const scrollHeight = Math.max(3, height - 4);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      borderColor={theme.brand}
      paddingX={1}
    >
      <Box justifyContent="space-between" width={innerWidth}>
        <Text bold color={theme.brand}>
          {figures.bullet} chat history (read-only)
        </Text>
        <Text dimColor>esc close · ↑/↓ scroll · g/G top/bottom</Text>
      </Box>
      <Box marginTop={1} flexDirection="column" height={scrollHeight} flexShrink={1} overflow="hidden" minHeight={0}>
        <ScrollView ref={scrollRef} flexDirection="column" width={innerWidth} onScroll={handleScroll}>
          {trail.length === 0 ? (
            <Text dimColor>(no activity yet)</Text>
          ) : (
            trail.map((entry) => <TrailRow key={entry.id} entry={entry} width={innerWidth} />)
          )}
        </ScrollView>
      </Box>
    </Box>
  );
}

function TrailRow({ entry, width }: { entry: TrailEntry; width: number }): React.ReactElement | null {
  if (entry.kind === TrailKind.Status) {
    return (
      <Box marginTop={1}>
        <Text color={statusColor(entry.tone)} dimColor={entry.tone === 'info'}>
          {statusGlyph(entry.tone)} {entry.message}
        </Text>
      </Box>
    );
  }
  if (entry.kind === TrailKind.Assistant) {
    return (
      <Box marginTop={1}>
        <Markdown source={entry.markdown} width={width} />
      </Box>
    );
  }
  if (entry.kind === TrailKind.ToolUse) {
    const branchTag = entry.branch ? `[${entry.branch}] ` : '';

    return (
      <Box marginTop={1}>
        <Text dimColor>
          {figures.pointerSmall} {branchTag}
          {shortenToolName(entry.toolName)} {entry.label ? `· ${entry.label}` : ''}
        </Text>
      </Box>
    );
  }
  if (entry.kind === TrailKind.Diff) {
    return <DiffBlock entry={entry} width={width} />;
  }
  if (entry.kind === TrailKind.Error) {
    return (
      <Box marginTop={1}>
        <Text color={theme.error}>
          {figures.cross} [{entry.source}] {entry.message}
        </Text>
      </Box>
    );
  }

  return null;
}

function DiffBlock({
  entry,
  width,
}: {
  entry: Extract<TrailEntry, { kind: TrailKind.Diff }>;
  width: number;
}): React.ReactElement {
  const lines = entry.patch.split('\n').filter((line) => !line.startsWith('===') && !line.startsWith('Index: '));
  const visible = lines.slice(0, MAX_DIFF_LINES);
  const truncated = lines.length > MAX_DIFF_LINES;

  return (
    <Box flexDirection="column" marginTop={1} width={width}>
      <Text color={theme.diff}>
        {figures.pointerSmall} diff {entry.file} <Text color={theme.ok}>+{entry.added}</Text>{' '}
        <Text color={theme.error}>-{entry.removed}</Text>
      </Text>
      <Box flexDirection="column" paddingLeft={2}>
        {visible.map((line, idx) => (
          <DiffLine key={`d-${entry.id}-${idx}`} line={line} />
        ))}
        {truncated ? <Text dimColor>{`… ${lines.length - MAX_DIFF_LINES} more line(s)`}</Text> : null}
      </Box>
    </Box>
  );
}

function DiffLine({ line }: { line: string }): React.ReactElement {
  if (line.startsWith('+++') || line.startsWith('---')) return <Text dimColor>{line}</Text>;
  if (line.startsWith('@@')) return <Text color="cyan">{line}</Text>;
  if (line.startsWith('+')) return <Text color="green">{line}</Text>;
  if (line.startsWith('-')) return <Text color="red">{line}</Text>;

  return <Text dimColor>{line}</Text>;
}

function statusColor(tone: 'info' | 'ok' | 'error' | 'warn'): string | undefined {
  if (tone === 'ok') return theme.ok;
  if (tone === 'error') return theme.error;
  if (tone === 'warn') return theme.warn;

  return undefined;
}

function statusGlyph(tone: 'info' | 'ok' | 'error' | 'warn'): string {
  if (tone === 'ok') return figures.tick;
  if (tone === 'error') return figures.cross;
  if (tone === 'warn') return figures.warning;

  return figures.bullet;
}
