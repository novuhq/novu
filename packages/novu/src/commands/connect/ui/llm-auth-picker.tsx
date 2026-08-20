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
  const idxRef = React.useRef(0);
  const settledRef = React.useRef(false);

  React.useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  useInput((_input, key) => {
    if (settledRef.current) {
      return;
    }

    if (key.escape) {
      settledRef.current = true;
      onCancel();

      return;
    }

    if (key.upArrow) {
      setIdx((current) => (current - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setIdx((current) => (current + 1) % options.length);
    } else if (key.return) {
      settledRef.current = true;
      onChange(options[idxRef.current].kind);
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
