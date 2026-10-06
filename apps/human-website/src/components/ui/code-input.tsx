'use client';

import { type ClipboardEvent, type KeyboardEvent, useRef } from 'react';

import { cn } from '@/lib/utils';

type CodeInputProps = {
  /** The digits typed so far. */
  value: string;
  onChange: (value: string) => void;
  /** Called once every box is filled. */
  onComplete?: (value: string) => void;
  length?: number;
  /** What the code is for, read by screen readers: "Code from the email". */
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/** One box per digit for a verification code. Typing moves forward, Backspace moves back, pasting fills every box. */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  label,
  invalid = false,
  disabled = false,
  autoFocus = false,
  className,
}: CodeInputProps) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  function update(next: string, focusIndex: number) {
    const digits = next.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    boxes.current[Math.min(focusIndex, length - 1)]?.focus();

    if (digits.length === length) {
      onComplete?.(digits);
    }
  }

  function handleInput(index: number, typed: string) {
    const digit = typed.replace(/\D/g, '').slice(-1);
    if (!digit) {
      return;
    }

    // Typing in the middle replaces that digit; typing past the end appends.
    const position = Math.min(index, value.length);
    update(value.slice(0, position) + digit + value.slice(position + 1), position + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const position = value[index] ? index : index - 1;
      if (position >= 0) {
        update(value.slice(0, position) + value.slice(position + 1), position);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      boxes.current[Math.max(index - 1, 0)]?.focus();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      boxes.current[Math.min(index + 1, value.length, length - 1)]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (pasted) {
      update(pasted, pasted.length);
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset can't lay its boxes out with flex in every browser
    <div role="group" aria-label={label} className={cn('flex gap-2', className)}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element;
          }}
          value={value[index] ?? ''}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          // biome-ignore lint/a11y/noAutofocus: the code is the only thing to do on these screens
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          className={cn(
            'size-11 rounded bg-background text-center font-mono text-lg text-foreground ring-1 ring-border-strong',
            'focus-visible:outline-none focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
            invalid && 'ring-danger focus-visible:ring-danger'
          )}
        />
      ))}
    </div>
  );
}
