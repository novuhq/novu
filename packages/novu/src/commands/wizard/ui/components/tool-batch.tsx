import { Box, Text } from 'ink';
import React from 'react';
import { shortenToolName } from '../../agent/tool-labels';
import { formatDuration } from '../state/session';
import { glyphs, theme } from '../theme';
import type { ToolCall } from '../types';

interface ToolBatchProps {
  calls: ToolCall[];
  durationMs: number;
  collapsed: boolean;
}

export function ToolBatch({ calls, durationMs, collapsed }: ToolBatchProps): React.ReactElement {
  const errorCount = calls.filter((call) => call.isError).length;
  const uniqueTools = Array.from(new Set(calls.map((call) => shortenToolName(call.name))));

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color={theme.tool}>
          {collapsed ? glyphs.collapsed : glyphs.expanded} {calls.length} tool {calls.length === 1 ? 'call' : 'calls'}{' '}
          {glyphs.bullet} {formatDuration(durationMs)}{' '}
          {errorCount > 0 ? <Text color={theme.error}>({errorCount} failed) </Text> : null}
          {glyphs.bullet} {uniqueTools.slice(0, 5).join(', ')}
          {uniqueTools.length > 5 ? '\u2026' : ''}
        </Text>
      </Box>
      {!collapsed ? (
        <Box flexDirection="column" paddingLeft={2}>
          {calls.map((call) => (
            <ToolCallRow key={call.id} call={call} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

interface ToolCallRowProps {
  call: ToolCall;
}

function ToolCallRow({ call }: ToolCallRowProps): React.ReactElement {
  const elapsed = call.endedAt ? formatDuration(call.endedAt - call.startedAt) : '\u2026';
  const name = shortenToolName(call.name).padEnd(18, ' ').slice(0, 18);

  return (
    <Box>
      <Text color={call.isError ? theme.error : theme.tool}>
        {call.isError ? glyphs.error : glyphs.bullet} {name} {call.label.padEnd(40, ' ').slice(0, 40)}{' '}
        <Text dimColor>{elapsed}</Text>
      </Text>
    </Box>
  );
}
