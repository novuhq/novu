import { Box, Text } from 'ink';
import React from 'react';
import { SLASH_COMMANDS } from '../slash-commands';
import { glyphs, theme } from '../theme';

interface HelpOverlayProps {
  width: number;
  onDismiss: () => void;
}

export function HelpOverlay({ width }: HelpOverlayProps): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1} width={width} marginTop={1}>
      <Text bold color={theme.brand}>
        Wizard {glyphs.bullet} commands & shortcuts
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>slash commands</Text>
        {SLASH_COMMANDS.map((cmd) => (
          <Text key={cmd.name}>
            <Text color={theme.brand}>{cmd.name}</Text> <Text dimColor>{cmd.description}</Text>
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>keybindings</Text>
        <Text>
          <Text color={theme.brand}>enter</Text> <Text dimColor>send message</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>ctrl+c</Text>{' '}
          <Text dimColor>interrupt the active turn (twice within 1.5s exits)</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>ctrl+l</Text> <Text dimColor>clear transcript</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>ctrl+r</Text> <Text dimColor>reuse last user message</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>tab</Text> <Text dimColor>autocomplete slash command</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>up/down</Text> <Text dimColor>history / suggestion navigation</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>pgup/pgdn</Text> <Text dimColor>scroll transcript by page</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>shift+up/down</Text> <Text dimColor>scroll transcript by line</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>ctrl/meta+up/down</Text> <Text dimColor>jump to top / bottom of transcript</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>mouse wheel</Text>{' '}
          <Text dimColor>scroll transcript (shift/alt+wheel = page; hold opt/shift to text-select)</Text>
        </Text>
        <Text>
          <Text color={theme.brand}>esc</Text> <Text dimColor>clear composer / dismiss panels</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>this panel is now part of the transcript — scroll past it freely</Text>
      </Box>
    </Box>
  );
}
