import { Box, Text } from 'ink';
import React from 'react';
import { glyphs, theme } from '../theme';

interface StatusFooterProps {
  tone: 'ok' | 'error' | 'info';
  message: string;
}

export function StatusFooter({ tone, message }: StatusFooterProps): React.ReactElement {
  const color = tone === 'error' ? theme.error : tone === 'info' ? theme.muted : theme.ok;
  const glyph = tone === 'error' ? glyphs.error : tone === 'info' ? glyphs.bullet : glyphs.ok;

  return (
    <Box marginTop={1}>
      <Text color={color}>
        {glyph} {message}
      </Text>
    </Box>
  );
}
