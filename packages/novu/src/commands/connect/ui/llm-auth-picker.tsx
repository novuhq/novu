import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { BridgeAdapterVariant } from '../pipeline/bridge-adapter/types';
import { getLlmAuthPickerOptions } from '../pipeline/llm-auth/llm-auth-options';
import type { LlmAuthKind } from '../pipeline/llm-auth/types';

export function LlmAuthPicker({
  connectMode,
  onChange,
  onCancel,
}: {
  connectMode: BridgeAdapterVariant;
  onChange: (value: LlmAuthKind) => void;
  onCancel: () => void;
}): React.ReactElement {
  const options = getLlmAuthPickerOptions(connectMode);
  const [idx, setIdx] = React.useState(0);

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();

      return;
    }

    if (key.upArrow) {
      setIdx((current) => (current - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setIdx((current) => (current + 1) % options.length);
    } else if (key.return) {
      onChange(options[idx].kind);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, rowIndex) => {
        const isSelected = rowIndex === idx;

        return (
          <Text key={opt.kind}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '› ' : '  '}
              {opt.title}
            </Text>
            {opt.detail ? <Text dimColor>{` · ${opt.detail}`}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}
