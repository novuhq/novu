import figures from 'figures';
import { Box, Text, useInput } from 'ink';
import React from 'react';
import { theme } from '../theme';

export type PickerOption<T = string> = {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export type PickerMenuProps<T = string> = {
  title?: string;
  options: PickerOption<T>[];
  /** When false, key handlers are detached (use while parent overlay is hidden). */
  isActive?: boolean;
  /** Called once when the user picks a row. */
  onSelect: (value: T) => void;
  /** Called when the user dismisses with Esc. */
  onCancel?: () => void;
  /** Initial selected index (0). */
  initialIndex?: number;
};

export function PickerMenu<T = string>({
  title,
  options,
  isActive = true,
  onSelect,
  onCancel,
  initialIndex = 0,
}: PickerMenuProps<T>): React.ReactElement {
  const [index, setIndex] = React.useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, options.length - 1)));

  React.useEffect(() => {
    setIndex((prev) => Math.min(prev, Math.max(0, options.length - 1)));
  }, [options.length]);

  useInput(
    (_input, key) => {
      if (key.escape) {
        if (onCancel) onCancel();

        return;
      }
      if (key.upArrow) {
        setIndex((prev) => moveCursor(prev, -1, options));

        return;
      }
      if (key.downArrow) {
        setIndex((prev) => moveCursor(prev, 1, options));

        return;
      }
      if (key.return) {
        const option = options[index];
        if (option && !option.disabled) onSelect(option.value);
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column">
      {title ? (
        <Box marginBottom={1}>
          <Text bold color={theme.brand}>
            {title}
          </Text>
        </Box>
      ) : null}
      {options.map((option, i) => {
        const selected = i === index;
        const indicator = selected ? figures.pointer : ' ';
        const labelColor = option.disabled ? theme.muted : selected ? theme.brand : undefined;

        return (
          <Box key={`${i}-${option.label}`} flexDirection="row" gap={1}>
            <Text color={selected ? theme.brand : theme.muted}>{indicator}</Text>
            <Text color={labelColor} dimColor={option.disabled} bold={selected}>
              {option.label}
            </Text>
            {option.hint ? <Text dimColor>{option.hint}</Text> : null}
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>↑/↓ to move · enter to select{onCancel ? ' · esc to cancel' : ''}</Text>
      </Box>
    </Box>
  );
}

function moveCursor<T>(prev: number, delta: number, options: PickerOption<T>[]): number {
  if (options.length === 0) return 0;
  let next = prev;
  for (let attempt = 0; attempt < options.length; attempt += 1) {
    next = (next + delta + options.length) % options.length;
    if (!options[next]?.disabled) return next;
  }

  return prev;
}
