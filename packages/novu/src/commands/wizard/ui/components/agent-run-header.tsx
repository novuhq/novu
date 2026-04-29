import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { shortenToolName } from '../../agent/tool-labels';
import { formatDuration } from '../state/session';
import { glyphs, theme } from '../theme';
import type { SessionState, ToolCall } from '../types';

interface AgentRunHeaderProps {
  state: SessionState;
  width: number;
}

const MAX_NAMES = 5;

export function AgentRunHeader({ state, width }: AgentRunHeaderProps): React.ReactElement | null {
  const visiblePhases: SessionState['phase'][] = ['installing-skills', 'agent-running', 'awaiting-input'];
  const isRunning = state.phase === 'agent-running' || state.phase === 'installing-skills';

  const [, setNow] = React.useState(0);
  React.useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setNow((tick) => tick + 1), 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  if (!visiblePhases.includes(state.phase)) return null;

  const calls: ToolCall[] = [];
  for (const entry of state.entries) {
    if (entry.kind === 'tool-batch') calls.push(...entry.calls);
  }
  if (state.activeToolBatch) calls.push(...state.activeToolBatch.calls);

  const totalCalls = calls.length;
  const failedCalls = calls.filter((call) => call.isError).length;
  const uniqueNames = uniqueOrdered(calls.map((call) => shortenToolName(call.name)));
  const namesLabel = formatNames(uniqueNames, width);

  const startedAt = state.turnStartedAt ?? state.activeToolBatch?.startedAt;
  const durationMs = startedAt ? Date.now() - startedAt : 0;

  const phaseLabel =
    state.phase === 'installing-skills' ? 'installing skills' : state.phase === 'agent-running' ? 'thinking' : 'idle';

  const segments: React.ReactNode[] = [];
  if (durationMs > 0) {
    segments.push(
      <Text key="dur" dimColor>
        {formatDuration(durationMs)}
      </Text>
    );
  }
  if (totalCalls > 0) {
    segments.push(
      <Text key="calls" dimColor>
        {`${totalCalls} tool ${totalCalls === 1 ? 'call' : 'calls'}`}
      </Text>
    );
  }
  if (failedCalls > 0) {
    segments.push(
      <Text key="fail" color={theme.error}>
        {`${failedCalls} failed`}
      </Text>
    );
  }
  if (namesLabel) {
    segments.push(
      <Text key="names" dimColor>
        {namesLabel}
      </Text>
    );
  }

  return (
    <Box width={width} height={1} flexShrink={0} paddingX={1}>
      {isRunning ? (
        <Text color={theme.warn}>
          <Spinner type="dots" />{' '}
        </Text>
      ) : (
        <Text color={theme.muted}>{glyphs.tool} </Text>
      )}
      <Text color={isRunning ? theme.warn : theme.muted}>{phaseLabel}</Text>
      {segments.map((segment, idx) => (
        <React.Fragment key={`seg-${idx}`}>
          <Text dimColor>{` ${glyphs.bullet} `}</Text>
          {segment}
        </React.Fragment>
      ))}
    </Box>
  );
}

function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

function formatNames(names: string[], width: number): string {
  if (names.length === 0) return '';
  const visible = names.slice(0, MAX_NAMES);
  const overflow = names.length - visible.length;
  let label = visible.join(', ');
  if (overflow > 0) label += `, +${overflow} more`;
  const budget = Math.max(20, width - 32);
  if (label.length > budget) label = `${label.slice(0, budget - 1)}\u2026`;

  return label;
}
