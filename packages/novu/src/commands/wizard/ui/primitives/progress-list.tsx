import { Spinner } from '@inkjs/ui';
import figures from 'figures';
import { Box, Text } from 'ink';
import React from 'react';
import { useElapsed } from '../hooks/use-elapsed';
import { theme } from '../theme';
import { formatDuration } from '../utils/format-duration';

export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Done = 'done',
  Error = 'error',
  Cancelled = 'cancelled',
}

export type ProgressItem = {
  id: string;
  /** Shown while the row hasn't started yet. */
  idleForm: string;
  /** Shown while the row is actively running (e.g. "Installing skills…"). */
  activeForm: string;
  /** Shown once the row is done (also used for error / cancelled fallback). */
  completedForm: string;
  status: TaskStatus;
  /** Optional sub-line under the row (e.g. last status message). */
  hint?: string;
  /** Wall-clock timestamp when the row first transitioned to running. */
  startedAt?: number;
  /** Final duration in ms. Only present once the row has settled. */
  durationMs?: number;
};

export type ProgressListProps = {
  items: ProgressItem[];
  /** Optional short header rendered above the list. */
  title?: string;
  /** Hide rows whose status is `pending`. Useful for the run screen "now" pane. */
  hidePending?: boolean;
  /**
   * When true, each row is annotated with its duration (settled rows) or
   * a live elapsed timer (running rows). Driven by the `--debug` CLI flag.
   */
  showTimings?: boolean;
};

export function ProgressList({
  items,
  title,
  hidePending = false,
  showTimings = false,
}: ProgressListProps): React.ReactElement {
  const visible = hidePending ? items.filter((item) => item.status !== TaskStatus.Pending) : items;

  return (
    <Box flexDirection="column">
      {title ? (
        <Box marginBottom={1}>
          <Text bold color={theme.brand}>
            {title}
          </Text>
        </Box>
      ) : null}
      {visible.map((item) => (
        <ProgressRow key={item.id} item={item} showTimings={showTimings} />
      ))}
      {showTimings ? <ProgressTotalsRow items={items} /> : null}
    </Box>
  );
}

function ProgressRow({ item, showTimings }: { item: ProgressItem; showTimings: boolean }): React.ReactElement {
  const { glyph, color } = describe(item.status);
  const text = pickText(item);
  const isRunning = item.status === TaskStatus.Running;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        {isRunning ? (
          <Box>
            <Spinner />
          </Box>
        ) : (
          <Text color={color}>{glyph}</Text>
        )}
        <Text dimColor={item.status === TaskStatus.Pending}>{text}</Text>
        {showTimings ? <ProgressTiming item={item} /> : null}
      </Box>
      {item.hint ? (
        <Box paddingLeft={2}>
          <Text dimColor>{item.hint}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function ProgressTiming({ item }: { item: ProgressItem }): React.ReactElement | null {
  const liveStart = item.status === TaskStatus.Running ? item.startedAt : undefined;
  const liveMs = useElapsed(liveStart);

  if (item.durationMs !== undefined) {
    return <Text dimColor>({formatDuration(item.durationMs)})</Text>;
  }
  if (item.status === TaskStatus.Running && item.startedAt !== undefined) {
    return <Text dimColor>({formatDuration(liveMs)})</Text>;
  }

  return null;
}

function ProgressTotalsRow({ items }: { items: ProgressItem[] }): React.ReactElement | null {
  const settled = items.filter((item) => item.durationMs !== undefined);
  if (settled.length === 0) return null;

  const total = settled.reduce((sum, item) => sum + (item.durationMs ?? 0), 0);

  return (
    <Box marginTop={1}>
      <Text dimColor>
        {figures.line} settled total: <Text color={theme.brand}>{formatDuration(total)}</Text>
        {settled.length < items.length ? (
          <Text dimColor>
            {' '}
            ({settled.length}/{items.length})
          </Text>
        ) : null}
      </Text>
    </Box>
  );
}

function pickText(item: ProgressItem): string {
  switch (item.status) {
    case TaskStatus.Running:
      return item.activeForm;
    case TaskStatus.Done:
    case TaskStatus.Error:
    case TaskStatus.Cancelled:
      return item.completedForm;
    case TaskStatus.Pending:
    default:
      return item.idleForm;
  }
}

function describe(status: TaskStatus): { glyph: string; color: string } {
  switch (status) {
    case TaskStatus.Done:
      return { glyph: figures.tick, color: theme.ok };
    case TaskStatus.Running:
      return { glyph: figures.pointerSmall, color: theme.brand };
    case TaskStatus.Error:
      return { glyph: figures.cross, color: theme.error };
    case TaskStatus.Cancelled:
      return { glyph: figures.line, color: theme.muted };
    case TaskStatus.Pending:
    default:
      return { glyph: figures.squareSmall, color: theme.muted };
  }
}
