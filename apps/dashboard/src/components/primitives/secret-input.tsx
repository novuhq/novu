import { useState } from 'react';
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { CopyButton } from './copy-button';
import { Input, InputProps } from './input';

interface SecretInputProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  copyButton?: boolean;
}

const ICON_SIZE_BY_INPUT_SIZE = {
  '2xs': 'size-3',
  xs: 'size-4',
  sm: 'size-5',
  md: 'size-5',
  lg: 'size-5',
  xl: 'size-5',
};

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
            <RiEyeOffLine
              className={cn(
                'text-text-soft group-has-[disabled]:text-text-disabled',
                ICON_SIZE_BY_INPUT_SIZE[props.size ?? 'sm']
              )}
            />
          ) : (
            <RiEyeLine
              className={cn(
                'text-text-soft group-has-[disabled]:text-text-disabled',
                ICON_SIZE_BY_INPUT_SIZE[props.size ?? 'sm']
              )}
            />
          )}
        </button>
      }
      trailingNode={copyButton ? <CopyButton valueToCopy={value ?? ''} /> : null}
    />
  );
}
