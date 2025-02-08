import { useState } from 'react';
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { CopyButton } from './copy-button';
import { Input, InputProps } from './input';

interface SecretInputProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  copyButton?: boolean;
}

export function SecretInput({ className, value, onChange, copyButton = false, ...props }: SecretInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Input
      type={revealed ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      inlineTrailingNode={
        <button type="button" onClick={() => setRevealed(!revealed)}>
          {revealed ? (
            <RiEyeOffLine className="text-text-soft group-has-[disabled]:text-text-disabled size-5" />
          ) : (
            <RiEyeLine className="text-text-soft group-has-[disabled]:text-text-disabled size-5" />
          )}
        </button>
      }
      trailingNode={
        copyButton ? (
          <CopyButton
            valueToCopy={value ?? ''}
            className="rounded-none border-l border-neutral-200 shadow-none ring-0"
          />
        ) : null
      }
    />
  );
}
