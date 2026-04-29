import { Box, Text } from 'ink';
import React from 'react';
import { Markdown } from '../markdown/render';
import { theme } from '../theme';

interface AssistantMarkdownProps {
  markdown: string;
  width: number;
  showCursor?: boolean;
}

export function AssistantMarkdown({ markdown, width, showCursor }: AssistantMarkdownProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text bold color={theme.wizard}>
          wizard
        </Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        <Markdown source={markdown} width={Math.max(20, width - 2)} />
        {showCursor ? (
          <Box>
            <Text color={theme.wizard}>{'\u258d'}</Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
