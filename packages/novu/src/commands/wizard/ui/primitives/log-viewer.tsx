import { Box, Text } from 'ink';
import React from 'react';
import { theme } from '../theme';

export type LogLine = {
  id: string;
  text: string;
  tone?: 'info' | 'ok' | 'error' | 'warn';
};

export type LogViewerProps = {
  lines: LogLine[];
  /** Maximum visible rows (newest first). Defaults to 5. */
  maxRows?: number;
  title?: string;
};

export function LogViewer({ lines, maxRows = 5, title }: LogViewerProps): React.ReactElement {
  const visible = lines.slice(-Math.max(1, maxRows));

  return (
    <Box flexDirection="column">
      {title ? (
        <Box>
          <Text bold dimColor>
            {title}
          </Text>
        </Box>
      ) : null}
      {visible.length === 0 ? (
        <Text dimColor>—</Text>
      ) : (
        visible.map((line) => (
          <Text key={line.id} color={toneColor(line.tone)} dimColor={!line.tone || line.tone === 'info'}>
            {line.text}
          </Text>
        ))
      )}
    </Box>
  );
}

function toneColor(tone?: LogLine['tone']): string | undefined {
  if (tone === 'ok') return theme.ok;
  if (tone === 'error') return theme.error;
  if (tone === 'warn') return theme.warn;

  return undefined;
}
