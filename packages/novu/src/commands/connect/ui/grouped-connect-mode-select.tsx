import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import {
  CONNECT_MODE_GROUPS,
  flattenConnectModeOptions,
} from '../connect-mode-options';
import type { AgentConnectMode } from '../types';

export function GroupedConnectModeSelect({
  onChange,
}: {
  onChange: (value: AgentConnectMode) => void;
}): React.ReactElement {
  const flatOptions = flattenConnectModeOptions();
  const [idx, setIdx] = React.useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setIdx((current) => (current - 1 + flatOptions.length) % flatOptions.length);
    } else if (key.downArrow) {
      setIdx((current) => (current + 1) % flatOptions.length);
    } else if (key.return) {
      onChange(flatOptions[idx].value);
    }
  });

  let optionIndex = 0;

  return (
    <Box flexDirection="column">
      {CONNECT_MODE_GROUPS.map((group) => (
        <Box key={group.heading} flexDirection="column">
          <Text dimColor>{group.heading}</Text>
          {group.options.map((opt) => {
            const rowIndex = optionIndex;
            optionIndex += 1;
            const isSelected = rowIndex === idx;

            return (
              <Text key={opt.value}>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {isSelected ? '› ' : '  '}
                  {opt.title}
                </Text>
                {opt.detail ? <Text dimColor>{` · ${opt.detail}`}</Text> : null}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
