import { useEffect, useRef } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { Input } from '@/components/primitives/input';
import { Kbd } from '@/components/primitives/kbd';

type IntegrationSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Search box for the integration store; `/` focuses it from anywhere on the page. */
export function IntegrationSearchInput({ value, onChange }: IntegrationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      inputRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="w-[220px]">
      <Input
        ref={inputRef}
        size="xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onChange('');
            inputRef.current?.blur();
          }
        }}
        placeholder="Search integrations"
        aria-label="Search integrations"
        leadingIcon={RiSearchLine}
        inlineTrailingNode={value ? null : <Kbd variant="flat">/</Kbd>}
      />
    </div>
  );
}
