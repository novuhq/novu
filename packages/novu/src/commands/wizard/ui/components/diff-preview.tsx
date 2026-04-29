import { Box, Text } from 'ink';
import React from 'react';
import { glyphs, theme } from '../theme';

interface DiffPreviewProps {
  file: string;
  patch: string;
  added: number;
  removed: number;
  collapsed: boolean;
  width: number;
}

const MAX_PREVIEW_LINES = 24;

export function DiffPreview({ file, patch, added, removed, collapsed, width }: DiffPreviewProps): React.ReactElement {
  const lines = patch.split('\n').filter((line) => !line.startsWith('===') && !line.startsWith('Index: '));
  const previewLines = collapsed ? [] : lines.slice(0, MAX_PREVIEW_LINES);
  const truncated = !collapsed && lines.length > MAX_PREVIEW_LINES;

  return (
    <Box flexDirection="column" marginTop={1} width={width}>
      <Box>
        <Text color={theme.diff}>
          {collapsed ? glyphs.collapsed : glyphs.expanded} diff {file} <Text color={theme.ok}>+{added}</Text>{' '}
          <Text color={theme.error}>-{removed}</Text>
        </Text>
      </Box>
      {!collapsed ? (
        <Box flexDirection="column" paddingLeft={2}>
          {previewLines.map((line, idx) => (
            <DiffLine key={`d-${idx}`} line={line} />
          ))}
          {truncated ? <Text dimColor>{`\u2026 ${lines.length - MAX_PREVIEW_LINES} more line(s)`}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}

interface DiffLineProps {
  line: string;
}

function DiffLine({ line }: DiffLineProps): React.ReactElement {
  if (line.startsWith('+++') || line.startsWith('---')) {
    return <Text dimColor>{line}</Text>;
  }
  if (line.startsWith('@@')) {
    return <Text color="cyan">{line}</Text>;
  }
  if (line.startsWith('+')) {
    return <Text color="green">{line}</Text>;
  }
  if (line.startsWith('-')) {
    return <Text color="red">{line}</Text>;
  }

  return <Text dimColor>{line}</Text>;
}
