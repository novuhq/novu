import { cn } from '@/utils/ui';
import { cva } from 'class-variance-authority';

import { VariableEditor } from '@/components/primitives/variable-editor';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { useIsTranslationEnabled } from '@/hooks/use-is-translation-enabled';

const variants = cva('relative w-full', {
  variants: {
    size: {
      md: 'p-2.5',
      sm: 'p-2',
      '2xs': 'px-2 py-1.5',
      '3xs': 'px-1.5 py-1 text-xs',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

type ControlInputProps = {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'md' | 'sm' | '2xs' | '3xs';
  id?: string;
  multiline?: boolean;
  indentWithTab?: boolean;
  enableTranslations?: boolean;
};

export function ControlInput({
  value,
  onChange,
  onBlur,
  variables,
  className,
  placeholder,
  autoFocus,
  id,
  multiline = false,
  size = 'sm',
  indentWithTab,
  isAllowedVariable,
  enableTranslations = false,
}: ControlInputProps) {
  const isTranslationEnabled = useIsTranslationEnabled() && enableTranslations;

  return (
    <VariableEditor
      className={cn(variants({ size }), className)}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      variables={variables}
      isAllowedVariable={isAllowedVariable}
      placeholder={placeholder}
      autoFocus={autoFocus}
      id={id}
      multiline={multiline}
      indentWithTab={indentWithTab}
      size={size}
      enableTranslations={isTranslationEnabled}
    />
  );
}
