import { Box, Text } from 'ink';
import React from 'react';
import { shortenToolName } from '../../agent/tool-labels';
import { glyphs, theme } from '../theme';
import type { SessionState } from '../types';
import { AssistantMarkdown } from './assistant-markdown';

interface LiveTailProps {
  state: SessionState;
  width: number;
}

export function LiveTail({ state, width }: LiveTailProps): React.ReactElement | null {
  const { liveAssistant, activeToolBatch } = state;

  if (liveAssistant && liveAssistant.markdown.length > 0) {
    return <AssistantMarkdown markdown={liveAssistant.markdown} width={width} showCursor />;
  }

  if (activeToolBatch && activeToolBatch.calls.length > 0) {
    const latest = activeToolBatch.calls[activeToolBatch.calls.length - 1];
    const label =
      latest.label.length > 0 ? `${shortenToolName(latest.name)} ${latest.label}` : shortenToolName(latest.name);

    return (
      <Box marginTop={1}>
        <Text color={theme.muted}>{glyphs.tool} latest </Text>
        <Text color={theme.muted}>{label}</Text>
      </Box>
    );
  }

  return null;
}
